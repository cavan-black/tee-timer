"""Check the rate-level 18/9-hole classification against live rate names.

    python -m tools.test_filters
"""
from __future__ import annotations

import sys
from datetime import date, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from teetimer import COURSES, scrape  # noqa: E402
from teetimer.models import rate_holes  # noqa: E402

CASES = [
    ("GF 18H ONLINE", 18, 18), ("GF 9H | ADULTO", 18, 9),
    ("GREEN FEE 18 HOLES", 18, 18), ("GREENFEE 9 HOLES", 18, 9),
    ("Green Fee 9H Buggy Incl. Tee 10", 18, 9), ("GF 9H TWILIGHT ONLINE", 18, 9),
    ("9 HOLES LINKS + SHARED BUGGY", 9, 9), ("Green fee", 18, 18),
    ("Green fee", 9, 9), ("2 GREEN FEES + BUGGY", 18, 18),
    ("GREEN-FEE EARLY BIRD - LOS LAGOS", 18, 18), ("TEE VERANO 9 HOYOS", 18, 9),
]

failed = 0
for name, course_holes, expected in CASES:
    got = rate_holes(name, course_holes)
    flag = "ok  " if got == expected else "FAIL"
    failed += got != expected
    print(f"  {flag} {name!r} on {course_holes}h -> {got} (expected {expected})")
print(f"\n{len(CASES) - failed}/{len(CASES)} unit cases pass\n")

day = date.today() + timedelta(days=1)
results = scrape([c for c in COURSES if c.holes == 18], day, window="any", players=1)
nine = sorted({t.rate_name for r in results for t in r.tee_times
               if rate_holes(t.rate_name, 18) == 9})
print(f"Rates on 18-hole tee sheets classified as 9 holes ({len(nine)}) for {day}:")
for name in nine[:40]:
    print("   ", name)
sys.exit(1 if failed else 0)
