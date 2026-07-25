"""Live tee-time and green-fee search across the Costa del Sol golf corridor."""

from .courses import AREAS, CORRIDOR, COURSES
from .models import Course, CourseResult, TeeTime
from .scraper import cheapest, scrape, scrape_course

__all__ = [
    "AREAS", "CORRIDOR", "COURSES",
    "Course", "CourseResult", "TeeTime",
    "scrape", "scrape_course", "cheapest",
]
