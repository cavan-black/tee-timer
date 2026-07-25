"""Checks for the MasterGolf (Miraflores) adapter, whose session caching and
10-row cap make it the most fragile source here.

    python -m tools.test_mastergolf [YYYY-MM-DD]
"""
from __future__ import annotations

import sys
from datetime import date, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from teetimer import COURSES  # noqa: E402
from teetimer.adapters import mastergolf  # noqa: E402
from teetimer.models import in_window  # noqa: E402
from teetimer.scraper import scrape_course  # noqa: E402

day = date.fromisoformat(sys.argv[1]) if len(sys.argv) > 1 else date.today() + timedelta(days=3)
course = next(c for c in COURSES if c.platform == "mastergolf")

# Clamping must be numeric: window_bounds yields unpadded clocks like "6:00",
# which sort *after* "07:00" as strings.
assert mastergolf._minutes("6:00") < mastergolf._minutes("07:00")
assert mastergolf._clock(mastergolf._minutes("07:30")) == "07:30"
print("  ok   clock helpers are numeric, not lexicographic")

results = {}
for window in ("any", "morning", "afternoon"):
    r = scrape_course(course, day, window, 1)
    results[window] = r
    times = [t.tee_off for t in r.tee_times]
    label = f"{times[0]:%H:%M}-{times[-1]:%H:%M}" if times else (r.error or r.note or "-")
    print(f"  {window:<10} n={len(times):>3}  {label}")

checks = [
    ("every window returns without error",
     all(r.error is None for r in results.values())),
    ("'any' is at least as large as morning and afternoon",
     len(results["any"].tee_times) >= max(len(results["morning"].tee_times),
                                          len(results["afternoon"].tee_times))),
    ("morning rows really are before noon",
     all(in_window(t.tee_off, "morning") for t in results["morning"].tee_times)),
    ("afternoon rows really are after noon",
     all(in_window(t.tee_off, "afternoon") for t in results["afternoon"].tee_times)),
    ("the 10-row cap was beaten by window splitting",
     len(results["any"].tee_times) > mastergolf.PAGE_CAP
     or len(results["any"].tee_times) == 0),
    ("no duplicate tee times survived the merge",
     len({t.tee_off for t in results["any"].tee_times}) == len(results["any"].tee_times)),
]
for name, ok in checks:
    print(f"  {'ok  ' if ok else 'FAIL'} {name}")

sys.exit(0 if all(ok for _, ok in checks) else 1)
