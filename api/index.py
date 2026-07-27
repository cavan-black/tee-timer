"""HTTP API over the scrapers, for the mobile app.

Deployed as a Vercel Python function. The mobile client can't scrape the
booking engines itself -- browsers/RN would hit CORS, and the work is far too
slow and battery-hungry for a phone -- so the same adapters run here and the
app just reads JSON.
"""
from __future__ import annotations

import json
import sys
import time
from collections import OrderedDict
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from threading import Lock

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from fastapi import FastAPI, HTTPException, Query, Response  # noqa: E402
from fastapi.responses import FileResponse  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402
from fastapi.middleware.gzip import GZipMiddleware  # noqa: E402

from teetimer import AREAS, COURSES, scrape  # noqa: E402
from teetimer.models import is_restricted, rate_holes  # noqa: E402

IMAGES: dict[str, str] = {}
_images_file = ROOT / "assets" / "course_images.json"
if _images_file.exists():
    IMAGES = json.loads(_images_file.read_text(encoding="utf-8"))

app = FastAPI(title="Tee Timer API", version="1.0.0")
app.add_middleware(GZipMiddleware, minimum_size=1024)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # public read-only data; no credentials are accepted
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["*"],
)

WINDOWS = {"any", "morning", "afternoon"}
MAX_AHEAD = 180

# --- Caching ---------------------------------------------------------------
# One search fans out to ~45 clubs' booking systems, and Miraflores alone costs
# about twenty requests. Repeating that for every tap would be inconsiderate to
# the clubs and slow for us, so results are cached briefly at two levels:
#
#   1. Vercel's CDN, via Cache-Control. Identical queries never reach the
#      function at all -- this is what actually spares the clubs, since it is
#      shared across every user and every instance.
#   2. This process, for when the CDN misses but the instance is warm.
#
# Five minutes is short enough that a slot taken in the meantime is unlikely,
# and every response carries `fetchedAt` so the client can show its true age.
CACHE_TTL = 300
CACHE_MAX = 64

_cache: OrderedDict[tuple, tuple[float, dict]] = OrderedDict()
_cache_lock = Lock()


def _cache_get(key: tuple) -> dict | None:
    with _cache_lock:
        hit = _cache.get(key)
        if hit is None:
            return None
        stored_at, payload = hit
        if time.monotonic() - stored_at > CACHE_TTL:
            _cache.pop(key, None)
            return None
        _cache.move_to_end(key)
        return payload


def _cache_put(key: tuple, payload: dict) -> None:
    with _cache_lock:
        _cache[key] = (time.monotonic(), payload)
        _cache.move_to_end(key)
        while len(_cache) > CACHE_MAX:
            _cache.popitem(last=False)


def course_json(c) -> dict:
    return {
        "key": c.key,
        "club": c.club,
        "course": c.course,
        "label": c.label,
        "area": c.area,
        "holes": c.holes,
        "corridor": c.corridor,
        "platform": c.platform,
        "image": IMAGES.get(c.tenant),
    }


COURSE_IMAGES = ROOT / "assets" / "courses"


@app.get("/api/image/{key}")
def course_image(key: str, response: Response):
    """Serve a downloaded course photo.

    Saved copies mean the app never touches a club's server for imagery --
    several began returning 403s or bot-challenge pages once we had fetched a
    few times, and the Google-hosted URLs are signed and rotate.
    """
    if not key.isalnum():                      # the key is a tenant slug
        raise HTTPException(404, "no such image")
    path = COURSE_IMAGES / f"{key}.jpg"
    if not path.is_file():
        raise HTTPException(404, "no such image")
    return FileResponse(
        path,
        media_type="image/jpeg",
        headers={"Cache-Control": "public, max-age=604800, immutable"},
    )


@app.get("/api/health")
def health() -> dict:
    return {"ok": True, "courses": len(COURSES),
            "clubs": len({c.club for c in COURSES}),
            "withImages": sum(1 for c in COURSES if IMAGES.get(c.tenant))}


@app.get("/api/courses")
def courses(response: Response) -> dict:
    # The registry only changes when a club switches booking platform.
    response.headers["Cache-Control"] = "public, s-maxage=3600, stale-while-revalidate=86400"
    return {
        "areas": AREAS,
        "courses": [course_json(c) for c in COURSES],
    }


@app.get("/api/search")
def search(
    response: Response,
    day: str = Query(..., alias="date", description="YYYY-MM-DD"),
    window: str = Query("any"),
    players: int = Query(1, ge=1, le=4),
    holes: str = Query("18", pattern="^(9|18|both)$"),
    areas: str | None = Query(None, description="comma-separated area names"),
    inland: bool = Query(False),
    restricted: bool = Query(False, description="include junior/member/pro rates"),
) -> dict:
    if window not in WINDOWS:
        raise HTTPException(400, f"window must be one of {sorted(WINDOWS)}")
    try:
        wanted = date.fromisoformat(day)
    except ValueError:
        raise HTTPException(400, "date must be YYYY-MM-DD")
    today = date.today()
    if not today <= wanted <= today + timedelta(days=MAX_AHEAD):
        raise HTTPException(400, f"date must be within {MAX_AHEAD} days from today")

    # Cache before any scraping. Set on every path so a CDN hit and a miss are
    # cached identically; stale-while-revalidate keeps the app snappy while a
    # fresh scrape runs behind it.
    response.headers["Cache-Control"] = (
        f"public, s-maxage={CACHE_TTL}, stale-while-revalidate={CACHE_TTL * 2}"
    )
    key = (wanted, window, players, holes, areas or "", inland, restricted)
    cached = _cache_get(key)
    if cached is not None:
        response.headers["X-Cache"] = "HIT"
        return cached
    response.headers["X-Cache"] = "MISS"

    picked = [c for c in COURSES if c.corridor or inland]
    if holes == "18":
        # 9-hole routes can't yield an 18-hole round; 18-hole sheets do sell
        # 9-hole fees, so only "18" narrows the course pool.
        picked = [c for c in picked if c.holes == 18]
    if areas:
        wanted_areas = {a.strip() for a in areas.split(",") if a.strip()}
        picked = [c for c in picked if c.area in wanted_areas]
    if not picked:
        raise HTTPException(400, "no courses matched those filters")

    results = scrape(picked, wanted, window=window, players=players)

    tee_times, problems = [], []
    for r in results:
        if r.error:
            problems.append({"course": r.course.label, "reason": r.error, "kind": "error"})
        elif not r.tee_times:
            problems.append({"course": r.course.label,
                             "reason": r.note or "nothing available", "kind": "empty"})
        for t in r.tee_times:
            played = rate_holes(t.rate_name, t.course.holes)
            if holes != "both" and played != int(holes):
                continue
            if not restricted and is_restricted(t.rate_name):
                continue
            tee_times.append({
                "courseKey": t.course.key,
                "club": t.course.club,
                "course": t.course.course,
                "label": t.course.label,
                "area": t.course.area,
                "image": IMAGES.get(t.course.tenant),
                "time": t.tee_off.strftime("%H:%M"),
                "price": round(t.price, 2),
                "rackPrice": t.rack_price,
                "discountPct": t.discount_pct or None,
                "rate": t.rate_name,
                "holes": played,
                "spaces": t.players_available,
                "includes": t.includes,
                "bookingUrl": t.booking_url,
            })

    tee_times.sort(key=lambda x: (x["time"], x["price"]))
    payload = {
        "date": wanted.isoformat(),
        "window": window,
        "players": players,
        "holes": holes,
        "fetchedAt": datetime.now(timezone.utc).isoformat(),
        "coursesQueried": len(picked),
        "coursesWithSpace": len({t["courseKey"] for t in tee_times}),
        "teeTimes": tee_times,
        "problems": problems,
    }
    _cache_put(key, payload)
    return payload
