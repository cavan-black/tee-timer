"""Fan out across every course's booking engine and collect tee times."""
from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from datetime import date

import requests

from .adapters import golfmanager, rioreal, teeone
from .models import Course, CourseResult, NoAvailability, TeeTime, in_window

MAX_WORKERS = 12


def _session() -> requests.Session:
    session = requests.Session()
    adapter = requests.adapters.HTTPAdapter(pool_maxsize=MAX_WORKERS, max_retries=1)
    session.mount("https://", adapter)
    return session


def scrape_course(
    course: Course,
    day: date,
    window: str = "any",
    players: int = 1,
    session: requests.Session | None = None,
) -> CourseResult:
    try:
        if course.platform == "golfmanager":
            times = golfmanager.fetch(course, day, session=session)
        elif course.platform == "teeone":
            times = teeone.fetch(course, day, window=window, players=-1, session=session)
        elif course.platform == "rioreal":
            times = rioreal.fetch(course, day, session=session)
        else:
            raise RuntimeError(f"unknown platform {course.platform!r}")
    except NoAvailability as exc:
        return CourseResult(course=course, note=str(exc))
    except Exception as exc:  # one dead club must not sink the whole search
        return CourseResult(course=course, error=f"{type(exc).__name__}: {exc}")

    times = [
        t for t in times
        if in_window(t.tee_off, window) and t.players_available >= players
        and t.max_players >= players
    ]
    times.sort(key=lambda t: (t.tee_off, t.price))
    return CourseResult(course=course, tee_times=times)


def scrape(
    courses: list[Course],
    day: date,
    window: str = "any",
    players: int = 1,
    progress=None,
) -> list[CourseResult]:
    """Scrape all `courses` concurrently. `progress(done, total, club)` is optional."""
    session = _session()
    results: list[CourseResult] = []
    total = len(courses)

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
        futures = {
            pool.submit(scrape_course, c, day, window, players, session): c
            for c in courses
        }
        for done, future in enumerate(_as_completed(futures), start=1):
            result = future.result()
            results.append(result)
            if progress:
                progress(done, total, result.course.label)

    order = {c.key: i for i, c in enumerate(courses)}
    results.sort(key=lambda r: order.get(r.course.key, 999))
    return results


def _as_completed(futures):
    from concurrent.futures import as_completed
    return as_completed(futures)


def cheapest(results: list[CourseResult]) -> list[TeeTime]:
    """Best-priced slot per course, for the summary view."""
    out = []
    for result in results:
        if result.tee_times:
            out.append(min(result.tee_times, key=lambda t: t.price))
    return sorted(out, key=lambda t: t.price)
