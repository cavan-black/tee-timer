"""Live tee-time and green-fee search across the Costa del Sol and the Algarve."""

from .courses import AREAS, AREAS_BY_REGION, CORRIDOR, COURSES, REGIONS, in_region
from .models import ALGARVE, COSTA_DEL_SOL, Course, CourseResult, TeeTime
from .scraper import cheapest, scrape, scrape_course

__all__ = [
    "AREAS", "AREAS_BY_REGION", "CORRIDOR", "COURSES", "REGIONS", "in_region",
    "ALGARVE", "COSTA_DEL_SOL",
    "Course", "CourseResult", "TeeTime",
    "scrape", "scrape_course", "cheapest",
]
