"""Golfmanager adapter.

Every Golfmanager club runs its public booking widget at
``https://<tenant>.golfmanager.com/consumer/ebookings``. That widget calls
``/ebookings/searchAvailability.api`` with no authentication, returning every
open slot for a day together with the live online price for each rate.
"""
from __future__ import annotations

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
