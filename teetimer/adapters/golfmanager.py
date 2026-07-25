"""Golfmanager adapters.

Golfmanager runs two generations of consumer booking front-end, and clubs are
spread across both:

* **Classic** — ``https://<tenant>.golfmanager.com/consumer/ebookings``, whose
  widget calls ``/ebookings/searchAvailability.api`` with no authentication.
* **Hosted** — ``https://eu.golfmanager.com/<tenant>``, a newer SPA calling
  ``/<tenant>/consumer/availability.json``. That one rejects anonymous calls
  with a 401; the page embeds a short-lived ``rid`` token in a meta tag which
  has to be echoed back as a request header.

Both are the same calls the clubs' own pages make.
"""
from __future__ import annotations

import re
from datetime import date, datetime

import requests

from ..models import Course, NoAvailability, TeeTime, fmt_date

TIMEOUT = 25
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/126.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
}


def booking_url(course: Course, day: date) -> str:
    url = f"https://{course.tenant}.golfmanager.com/consumer/ebookings?date={fmt_date(day)}"
    if course.resource_type is not None:
        url += f"&resourcetype={course.resource_type}"
    if course.resource is not None:
        url += f"&resource={course.resource}"
    return url


def fetch(course: Course, day: date, session: requests.Session | None = None) -> list[TeeTime]:
    http = session or requests
    params: dict[str, object] = {"start": fmt_date(day)}
    if course.resource_type is not None:
        params["idResourceType"] = course.resource_type
    if course.resource is not None:
        params["idResource"] = course.resource

    resp = http.get(
        f"https://{course.tenant}.golfmanager.com/ebookings/searchAvailability.api",
        params=params,
        headers=HEADERS,
        timeout=TIMEOUT,
    )
    resp.raise_for_status()
    payload = resp.json()

    availability = payload.get("availability")
    # When a day is closed or fully booked Golfmanager swaps the list for an
    # object pointing at the next free day.
    if isinstance(availability, dict):
        nudge = availability.get("nextDate")
        if nudge:
            raise NoAvailability(f"nothing free; next opening {nudge[:10]}")
        raise NoAvailability("nothing free")

    url = booking_url(course, day)
    out: list[TeeTime] = []
    for slot in availability or []:
        try:
            tee_off = datetime.fromisoformat(slot["date"]).time()
        except (KeyError, ValueError):
            continue
        seats = int(slot.get("slots") or 0)
        for rate in slot.get("types") or []:
            price = rate.get("price")
            if price is None:
                continue
            # Some tenants expose members-only or package-only rates that a
            # visitor can never actually book -- skip them.
            if rate.get("onlyMembers") or rate.get("onlyPackage") or rate.get("requiresTag"):
                continue
            rack = rate.get("rack") or None
            out.append(
                TeeTime(
                    course=course,
                    tee_off=tee_off,
                    price=float(price),
                    rate_name=(rate.get("name") or "Green fee").strip(),
                    players_available=seats or int(rate.get("max") or 4),
                    max_players=int(rate.get("max") or 4),
                    rack_price=float(rack) if rack else None,
                    booking_url=url,
                )
            )
    return out


# ---------------------------------------------------------------------------
# Hosted front-end (eu.golfmanager.com/<tenant>)
# ---------------------------------------------------------------------------

HOSTED = "https://eu.golfmanager.com"
_RID = re.compile(r'name="rid" content="([^"]+)"')


def hosted_booking_url(course: Course, day: date) -> str:
    area = course.resource_type if course.resource_type is not None else 1
    return f"{HOSTED}/{course.tenant}/consumer/book?area={area}&date={fmt_date(day)}T00:00"


def _hosted_session(tenant: str) -> requests.Session:
    """The `rid` token is minted per page load and expires, so it is fetched
    fresh for each scrape rather than cached."""
    session = requests.Session()
    session.headers.update(HEADERS)
    home = session.get(f"{HOSTED}/{tenant}", timeout=TIMEOUT)
    home.raise_for_status()
    match = _RID.search(home.text)
    if not match:
        raise RuntimeError(f"no rid token on the {tenant} landing page")
    session.headers["rid"] = match.group(1)
    return session


def fetch_hosted(course: Course, day: date, players: int = 1, **_) -> list[TeeTime]:
    session = _hosted_session(course.tenant)
    area = course.resource_type if course.resource_type is not None else 1
    resp = session.get(
        f"{HOSTED}/{course.tenant}/consumer/availability.json",
        params={"date": f"{fmt_date(day)}T00:00", "area": area,
                "participants": max(1, players)},
        timeout=TIMEOUT,
    )
    resp.raise_for_status()
    items = resp.json().get("items") or []
    if not items:
        raise NoAvailability("nothing bookable online for this date")

    url = hosted_booking_url(course, day)
    out: list[TeeTime] = []
    for item in items:
        price = item.get("price")
        start = item.get("start")
        if price is None or not start:
            continue
        try:
            tee_off = datetime.fromisoformat(start).time()
        except ValueError:
            continue
        rack = item.get("normalPrice")
        seats = int(item.get("slots") or 0)
        out.append(
            TeeTime(
                course=course,
                tee_off=tee_off,
                price=float(price),
                rate_name=(item.get("name") or item.get("priceName") or "Green fee").strip(),
                players_available=seats or 4,
                max_players=seats or 4,
                rack_price=float(rack) if rack else None,
                booking_url=url,
            )
        )
    return out
