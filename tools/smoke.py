"""Hit every registered course once and report what came back.

    python -m tools.smoke [YYYY-MM-DD] [morning|afternoon|any]
"""
from __future__ import annotations

import sys
from datetime import date, timedelta

sys.path.insert(0, str(__import__("pathlib").Path(__file__).resolve().parent.parent))

from teetimer import COURSES, cheapest, scrape  # noqa: E402

day = date.fromisoformat(sys.argv[1]) if len(sys.argv) > 1 else date.today() + timedelta(days=3)
window = sys.argv[2] if len(sys.argv) > 2 else "any"

print(f"Scanning {len(COURSES)} courses for {day} ({window})\n")
results = scrape(COURSES, day, window=window, players=1)

ok = fail = empty = 0
for r in results:
    if r.error:
        fail += 1
        print(f"  FAIL  {r.course.label:<45} {r.error[:90]}")
    elif not r.tee_times:
        empty += 1
        print(f"  ----  {r.course.label:<45} {r.note or 'no availability'}")
    else:
        ok += 1
        best = min(r.tee_times, key=lambda t: t.price)
        print(f"  OK    {r.course.label:<45} {len(r.tee_times):>3} slots  "
              f"from EUR {best.price:>6.2f}  @ {best.tee_off:%H:%M}  ({best.rate_name[:34]})")

print(f"\n{ok} with availability | {empty} empty | {fail} failed")
print("\nCheapest overall:")
for t in cheapest(results)[:8]:
    print(f"  EUR {t.price:>7.2f}  {t.tee_off:%H:%M}  {t.course.label} — {t.rate_name[:40]}")
