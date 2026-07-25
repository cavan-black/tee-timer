"""Río Real adapter.

Río Real left TeeOne and runs its own engine at ``reservas-golf.rioreal.com``,
which is server-rendered: ``/reserva/fecha:YYYY-MM-DD`` returns the day's sheet
as HTML.

It also sells differently from every other club here. Rather than individual
tee times it offers *franjas* -- priced time bands ("08:00 - 09:50 → €141"),
with the exact tee time settled at the next step. We surface one row per band,
timed at the band's opening, and say so in the rate name so it can't be
mistaken for a confirmed slot.
"""
from __future__ import annotations

import re
from datetime import date, datetime

import requests

from ..models import Course, NoAvailability, TeeTime, fmt_date

BASE = "https://reservas-golf.rioreal.com"
TIMEOUT = 30
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/126.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml",
    "Accept-Language": "en-GB,en;q=0.9,es;q=0.8",
}

_BAND = re.compile(r'<li id="franja-\d+"[^>]*class="franjahoraria".*?</li>', re.S)
_RANGE = re.compile(r'<div class="franja">\s*([0-2]?\d:[0-5]\d)\s*-\s*([0-2]?\d:[0-5]\d)', re.S)
_PRICE = re.compile(r"valorprecio'?\"?>\s*([\d.,]+)\s*&euro;|valorprecio'?\"?>\s*([\d.,]+)\s*€", re.S)
_PROMO = re.compile(r"seleccionafranja\((\d+)\)")
_NAMES = re.compile(r'listafranjasnombre\[(\d+)\]\s*=\s*"([^"]*)"')


def booking_url(course: Course, day: date) -> str:
    return f"{BASE}/reserva/fecha:{fmt_date(day)}"


def _price(chunk: str) -> float | None:
    match = _PRICE.search(chunk)
    if not match:
        return None
    raw = match.group(1) or match.group(2)
    # Spanish formatting: 1.234,50
    raw = raw.replace(".", "").replace(",", ".") if "," in raw else raw
    try:
        return float(raw)
    except ValueError:
        return None


def fetch(course: Course, day: date, session: requests.Session | None = None) -> list[TeeTime]:
    http = session or requests
    url = booking_url(course, day)
    resp = http.get(url, headers=HEADERS, timeout=TIMEOUT)
    resp.raise_for_status()
    html = resp.text

    names = dict(_NAMES.findall(html))
    bands = _BAND.findall(html)
    if not bands:
        raise NoAvailability("no time bands published for this date")

    out: list[TeeTime] = []
    for chunk in bands:
        window = _RANGE.search(chunk)
        price = _price(chunk)
        if not window or price is None:
            continue  # sold out bands render without a price
        try:
            opens = datetime.strptime(window.group(1), "%H:%M").time()
        except ValueError:
            continue
        promo = _PROMO.search(chunk)
        label = names.get(promo.group(1), "").strip() if promo else ""
        span = f"{window.group(1)}–{window.group(2)}"
        out.append(
            TeeTime(
                course=course,
                tee_off=opens,
                price=price,
                rate_name=f"{label + ' · ' if label else ''}time band {span}",
                players_available=4,
                max_players=4,
                booking_url=url,
            )
        )
    if not out:
        raise NoAvailability("all time bands sold out")
    return out
