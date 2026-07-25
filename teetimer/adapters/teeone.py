"""TeeOne adapter.

TeeOne clubs publish a booking engine at
``https://open.teeone.golf/en/<slug>/disponibilidad``. The page carries a
per-club API token in a hidden input; the engine then POSTs that token to
``api.teeone.golf`` to list routes and day availability. We do the same:
scrape the token once per club (cached), then query availability per route.
"""
from __future__ import annotations

import re
from datetime import date, datetime

import requests

from ..models import Course, NoAvailability, TeeTime, fmt_date, window_bounds

API = "https://api.teeone.golf/InternalBookingEngine/v1"
ENGINE = "https://open.teeone.golf"
TIMEOUT = 30
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/126.0 Safari/537.36",
    "Content-Type": "application/json",
    "Accept": "application/json, text/plain, */*",
}
_HIDDEN = ("HidTokenAPI", "HidVendedor", "HidVendedorProveedor", "HidVendedorTourOperador")

_credential_cache: dict[str, dict[str, str]] = {}


def _hidden(html: str, name: str) -> str:
    match = re.search(r'id="%s"\s+value="([^"]*)"' % re.escape(name), html)
    return match.group(1) if match else ""


def credentials(slug: str, session: requests.Session | None = None) -> dict[str, str]:
    """Per-club API token + vendor ids, lifted from the booking page."""
    if slug in _credential_cache:
        return _credential_cache[slug]

    http = session or requests
    resp = http.get(
        f"{ENGINE}/en/{slug}/disponibilidad",
        headers={"User-Agent": HEADERS["User-Agent"]},
        timeout=TIMEOUT,
    )
    resp.raise_for_status()
    creds = {name: _hidden(resp.text, name) for name in _HIDDEN}
    if not creds["HidTokenAPI"]:
        raise RuntimeError(f"TeeOne club '{slug}' is unavailable (no API token on page)")

    payload = {
        "culture": "en-GB",
        "token": creds["HidTokenAPI"],
        "idInicioSesion": "-1",
        "idVendedor": creds["HidVendedor"],
        "idVendedorProveedor": creds["HidVendedorProveedor"],
        "idVendedorTourOperador": creds["HidVendedorTourOperador"],
    }
    _credential_cache[slug] = payload
    return payload


def routes(slug: str, session: requests.Session | None = None) -> list[dict]:
    """List a club's bookable routes -- used by tools/discover.py, not the app."""
    http = session or requests
    resp = http.post(
        f"{API}/Api/Vendedor/ObtenerRecorridosVendedor",
        json=credentials(slug, session),
        headers=HEADERS,
        timeout=TIMEOUT,
    )
    resp.raise_for_status()
    return (resp.json().get("datos") or {}).get("listaRecorridos") or []


def booking_url(course: Course, day: date, window: str = "any") -> str:
    hora = {"morning": "m", "afternoon": "t"}.get(window, "a")
    return (
        f"{ENGINE}/en/{course.tenant}/disponibilidad"
        f"?rec={course.route}&fecha={fmt_date(day, '/')}&hora={hora}"
    )


def fetch(
    course: Course,
    day: date,
    window: str = "any",
    players: int = -1,
    session: requests.Session | None = None,
) -> list[TeeTime]:
    http = session or requests
    start, end = window_bounds(window)
    payload = dict(
        credentials(course.tenant, session),
        idRecorrido=course.route,
        fecha=fmt_date(day, "/"),
        horaInicio=start,
        horaFin=end,
        jugadores=str(players),
        precioInicio="1",
        precioFin="9999",
        promoCode="",
        pageSize=300,
        pageNum=1,
        idTarifaTipoUso=1,  # open (non-member) bookings
    )
    resp = http.post(
        f"{API}/Api/Disponibilidad/ObtenerDisponibilidadDia",
        json=payload,
        headers=HEADERS,
        timeout=TIMEOUT,
    )
    resp.raise_for_status()
    data = resp.json()
    if data.get("cod") != 1:
        message = (data.get("msg") or "").strip()
        # The club simply has no online rate sheet published for that route on
        # that date -- a normal state, not a scraping failure.
        if "rate configuration" in message or "tarifa" in message.lower():
            raise NoAvailability("no online rates published for this date")
        raise RuntimeError(message or "TeeOne returned no data")

    url = booking_url(course, day, window)
    out: list[TeeTime] = []
    for slot in data.get("horasDisponibles") or []:
        try:
            tee_off = datetime.strptime(slot["hora"].strip(), "%H:%M").time()
        except (KeyError, ValueError):
            continue
        seats = int(slot.get("jugadoresDisponibles") or 0)
        for rate in slot.get("tarifas") or []:
            price = rate.get("precio")
            if price is None:
                continue
            bookable = rate.get("numJugadoresReservables") or []
            rack = rate.get("precioRack") or None
            # Multi-player packages quote a total; normalise to per-player so
            # prices are comparable across every course in the table.
            divisor = 1
            multiplier = rate.get("multiplicadorPrecioPaquete")
            if rate.get("idTarifaTipo") == 3 and multiplier:
                divisor = round(1 / float(multiplier)) or 1
            out.append(
                TeeTime(
                    course=course,
                    tee_off=tee_off,
                    price=round(float(price) / divisor, 2),
                    rate_name=(rate.get("nombre") or "Green fee").strip(),
                    players_available=seats or (max(bookable) if bookable else 4),
                    max_players=max(bookable) if bookable else 4,
                    rack_price=round(float(rack) / divisor, 2) if rack else None,
                    includes=list(rate.get("serviciosIncluidos") or []),
                    booking_url=url,
                )
            )
    return out
