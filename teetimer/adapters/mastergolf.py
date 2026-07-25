"""MasterGolf adapter (Miraflores).

An older PHP booking system. Three quirks shape this adapter:

1. **The search is a form POST**, not an API — ``selnav.php`` renders the
   results straight into an HTML table.
2. **Each session caches its first search.** Re-posting different criteria on
   the same session silently returns the original result set, so every query
   needs a fresh session (a language handshake plus the search form).
3. **Results are hard-capped at 10 rows** with no pager. So a query that comes
   back with exactly 10 rows has probably been truncated; we split the time
   window and re-query until each slice fits under the cap.

Together that means one scrape costs a handful of requests rather than one,
which is why the window is narrowed to the caller's morning/afternoon choice
before we start.
"""
from __future__ import annotations

import re
from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime

import requests

from ..models import Course, NoAvailability, TeeTime, window_bounds

BASE = "https://reservas72.miraflores-golf.com/miraflorescf/en/"
TIMEOUT = 30
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/126.0 Safari/537.36",
}
PAGE_CAP = 10           # rows selnav.php returns before truncating
SLICE_MINUTES = 120     # initial window slices; ~10 slots each on a busy day
MIN_SLICE_MINUTES = 30  # the form's own granularity; don't split below this
WORKERS = 4             # be gentle: each query is three requests

_ROW = re.compile(
    r"<td[^>]*>(\d{4}-\d{2}-\d{2})</td>\s*"
    r"<td[^>]*>([0-2]?\d:[0-5]\d)</td>\s*"
    r"<td[^>]*>([\d.,]+)</td>\s*"
    r"<td[^>]*>(\d+)</td>",
    re.S,
)


def booking_url(*_) -> str:
    return "https://reservas72.miraflores-golf.com/"


def _query(day: date, start: str, end: str) -> list[tuple[str, str, str, str]]:
    """One search on a throwaway session."""
    session = requests.Session()
    session.headers.update(HEADERS)
    session.get(BASE + "en_idioma.php", timeout=TIMEOUT)
    session.get(BASE + "dispfe.php", timeout=TIMEOUT)
    resp = session.post(
        BASE + "selnav.php",
        data={"idaccion": "DISPONIBILIDAD",
              "Fec_Ini": day.isoformat(), "Fec_Fin": day.isoformat(),
              "Hora_Ini": start, "Hora_Fin": end, "aceptar": "Check"},
        timeout=TIMEOUT,
    )
    resp.raise_for_status()
    return _ROW.findall(resp.text)


def _minutes(clock: str) -> int:
    hours, mins = clock.split(":")
    return int(hours) * 60 + int(mins)


def _clock(minutes: int) -> str:
    return f"{minutes // 60:02d}:{minutes % 60:02d}"


def _collect(day: date, lo: int, hi: int) -> dict[tuple, tuple]:
    """Cover `lo`-`hi` (minutes past midnight) despite the 10-row cap.

    Slice the window up front and query the slices concurrently, then halve
    only the slices that came back capped. Splitting breadth-first matters:
    a depth-first recursion on a shared query budget spends it all on the
    morning and silently drops the late afternoon.
    """
    found: dict[tuple, tuple] = {}
    pending = [(a, min(a + SLICE_MINUTES, hi))
               for a in range(lo, hi, SLICE_MINUTES)]

    while pending:
        with ThreadPoolExecutor(max_workers=WORKERS) as pool:
            batch = list(pool.map(
                lambda w: (w, _query(day, _clock(w[0]), _clock(w[1]))), pending))

        pending = []
        for (a, b), rows in batch:
            for row in rows:
                found[(row[1], row[2])] = row
            if len(rows) >= PAGE_CAP and (b - a) > MIN_SLICE_MINUTES:
                middle = (a + b) // 2
                pending += [(a, middle), (middle, b)]
    return found


# The form only offers 07:00-18:00, in half-hour steps.
OPENS, CLOSES, STEP = 7 * 60, 18 * 60, 30


def fetch(course: Course, day: date, window: str = "any", **_) -> list[TeeTime]:
    raw_start, raw_end = window_bounds(window)
    # Clamp and snap numerically -- window_bounds yields unpadded clocks like
    # "6:00", so comparing the strings would put it *after* "07:00".
    lo = max(OPENS, _minutes(raw_start) // STEP * STEP)
    hi = min(CLOSES, -(-_minutes(raw_end) // STEP) * STEP)
    if hi <= lo:
        raise NoAvailability("outside the course's booking hours")
    rows = _collect(day, lo, hi)
    if not rows:
        raise NoAvailability("no tee times published for this window")

    url = booking_url()
    out: list[TeeTime] = []
    for _, clock, price, seats in rows.values():
        try:
            tee_off = datetime.strptime(clock, "%H:%M").time()
            amount = float(price.replace(",", "."))
        except ValueError:
            continue
        out.append(
            TeeTime(
                course=course,
                tee_off=tee_off,
                price=amount,
                rate_name="Green fee 18 holes",
                players_available=int(seats),
                max_players=4,
                booking_url=url,
            )
        )
    out.sort(key=lambda t: t.tee_off)
    return out


def probe(day: date | None = None) -> str:
    """Used by tools/discover.py."""
    day = day or date.today()
    rows = _query(day, "07:00", "18:00")
    return f"{len(rows)} rows for {day}: " + ", ".join(f"{r[1]}@{r[2]}" for r in rows[:6])
