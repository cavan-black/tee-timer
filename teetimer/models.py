"""Shared data types for tee-time results."""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import date, time


@dataclass(frozen=True)
class Course:
    """One bookable 18/9-hole route at a club."""

    club: str
    course: str
    area: str
    holes: int
    platform: str
    # platform-specific handles
    tenant: str = ""          # golfmanager subdomain / teeone slug
    resource_type: int | None = None   # golfmanager idResourceType
    resource: int | None = None        # golfmanager idResource
    route: str = ""                    # teeone idRec
    corridor: bool = True     # inside the Sotogrande -> Fuengirola corridor

    @property
    def key(self) -> str:
        return f"{self.platform}:{self.tenant}:{self.resource or self.route or '-'}"

    @property
    def label(self) -> str:
        return self.club if self.course in ("", self.club) else f"{self.club} — {self.course}"


@dataclass
class TeeTime:
    """A single bookable slot at a single price."""

    course: Course
    tee_off: time
    price: float
    rate_name: str
    players_available: int
    max_players: int = 4
    rack_price: float | None = None
    includes: list[str] = field(default_factory=list)
    booking_url: str = ""

    @property
    def discount_pct(self) -> float:
        if not self.rack_price or self.rack_price <= self.price:
            return 0.0
        return round((self.rack_price - self.price) / self.rack_price * 100, 1)


class NoAvailability(Exception):
    """The engine answered fine, there is simply nothing bookable."""


@dataclass
class CourseResult:
    """Outcome of scraping one course, including failures."""

    course: Course
    tee_times: list[TeeTime] = field(default_factory=list)
    error: str | None = None
    note: str | None = None


_NINE = re.compile(r"\b(9\s*(h|holes?|hoyos|löcher|trous)?|nine|twilight\s*9)\b", re.I)
_EIGHTEEN = re.compile(r"\b(18\s*(h|holes?|hoyos)?|eighteen)\b", re.I)


def rate_holes(rate_name: str, course_holes: int) -> int:
    """How many holes a rate actually buys.

    An 18-hole course routinely sells 9-hole green fees off the same tee
    sheet, so the course's own hole count is only a fallback.
    """
    if _EIGHTEEN.search(rate_name):
        return 18
    if _NINE.search(rate_name):
        return 9
    return course_holes


def in_window(t: time, window: str) -> bool:
    """`window` is one of 'any', 'morning', 'afternoon'."""
    if window == "morning":
        return t < time(12, 0)
    if window == "afternoon":
        return t >= time(12, 0)
    return True


def window_bounds(window: str) -> tuple[str, str]:
    """Start/end clock strings the way TeeOne's own booking engine sends them."""
    if window == "morning":
        return "6:00", "12:00"
    if window == "afternoon":
        return "12:01", "22:00"
    return "6:00", "22:00"


def fmt_date(d: date, sep: str = "-") -> str:
    return d.strftime(f"%Y{sep}%m{sep}%d")
