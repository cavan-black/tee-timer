"""Re-verify the course registry against the live booking engines.

Clubs occasionally add courses, rename routes or switch platform. Run this to
see what each engine currently reports, then update ``teetimer/courses.py``.

    python -m tools.discover
"""
from __future__ import annotations

import json
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import requests

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from teetimer.adapters import teeone  # noqa: E402
from teetimer.courses import COURSES  # noqa: E402

UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}


def golfmanager_tenant(tenant: str) -> str:
    url = f"https://{tenant}.golfmanager.com/ebookings/init.api?start=2030-01-01"
    data = requests.get(url, headers=UA, timeout=25).json()
    types = ", ".join(f"{t['id']}={t['name']}" for t in data.get("resourceTypes") or [])
    resources = ", ".join(f"{r['id']}={r['name']}" for r in data.get("resources") or [])
    return f"golfmanager/{tenant}\n    resourceTypes: {types}\n    resources:     {resources}"


def teeone_club(slug: str) -> str:
    routes = teeone.routes(slug)
    if not routes:
        return f"teeone/{slug}\n    (no routes)"
    club = routes[0].get("clubNombre")
    lines = "\n".join(f"    {r['idRec']:>5} = {r['nom']} ({r['NumHoyos']}h)" for r in routes)
    return f"teeone/{slug} — {club}\n{lines}"


def rioreal_bands(_: str) -> str:
    from datetime import date, timedelta

    from teetimer.adapters import rioreal
    from teetimer.courses import COURSES as _C

    course = next(c for c in _C if c.platform == "rioreal")
    day = date.today() + timedelta(days=7)
    bands = rioreal.fetch(course, day)
    lines = "\n".join(f"    {b.tee_off:%H:%M}  €{b.price:.2f}  {b.rate_name}" for b in bands)
    return f"rioreal — Río Real Golf (time bands, {day})\n{lines}"


CHECKERS = {
    "golfmanager": golfmanager_tenant,
    "teeone": teeone_club,
    "rioreal": rioreal_bands,
}


def check(item: tuple[str, str]) -> str:
    platform, tenant = item
    try:
        return CHECKERS[platform](tenant)
    except Exception as exc:
        return f"{platform}/{tenant}\n    FAILED: {type(exc).__name__}: {exc}"


if __name__ == "__main__":
    tenants = sorted({(c.platform, c.tenant) for c in COURSES})
    print(f"Verifying {len(tenants)} booking-engine tenants "
          f"backing {len(COURSES)} courses\n")
    with ThreadPoolExecutor(max_workers=10) as pool:
        for line in pool.map(check, tenants):
            print(line)
