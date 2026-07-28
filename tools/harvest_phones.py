"""Collect each club's clubhouse telephone number.

Not every golfer wants to book through a web form, and some of these tee
sheets are easier to sort out by voice. Numbers come from the clubs' own
sites: a `tel:` link first, since that is unambiguous, then a Spanish number
in the page text.

    python -m tools.harvest_phones          -> assets/course_phones.json
"""
from __future__ import annotations

import json
import re
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from teetimer.courses import COURSES  # noqa: E402
from teetimer.sites import SITES  # noqa: E402
from tools.harvest_images import _get  # noqa: E402

OUT = ROOT / "assets" / "course_phones.json"

# Spanish landlines start 8 or 9, mobiles 6 or 7; nine digits, often spaced.
_TEL_LINK = re.compile(r'href=["\']tel:([+0-9()\s.\-]{8,24})["\']', re.I)
_TEXT = re.compile(r'(?:\+34[\s.\-]?)?(?:\(?\+?34\)?[\s.\-]?)?([689]\d{2}[\s.\-]?\d{3}[\s.\-]?\d{3})\b')
# Pages that also list a fax or a mobile put them next to the main number, so
# prefer whatever sits closest to a "phone" word.
_NEAR = re.compile(r'(?i)(tel|tlf|phone|teléfono|telefono|llamar|call)')

PAGES = ["", "contacto", "contact", "contact-us", "en/contact", "es/contacto"]


def normalise(raw: str) -> str | None:
    digits = re.sub(r"[^\d]", "", raw)
    if digits.startswith("0034"):
        digits = digits[4:]
    if digits.startswith("34") and len(digits) == 11:
        digits = digits[2:]
    if len(digits) != 9 or digits[0] not in "6789":
        return None
    return f"+34 {digits[:3]} {digits[3:6]} {digits[6:]}"


def find(tenant: str) -> tuple[str, str | None, str]:
    base = SITES.get(tenant)
    if not base:
        return tenant, None, "no site"
    for path in PAGES:
        url = f"{base.rstrip('/')}/{path}" if path else base
        try:
            html = _get(url, timeout=20)
        except Exception:
            continue
        for raw in _TEL_LINK.findall(html):
            num = normalise(raw)
            if num:
                return tenant, num, f"tel: link ({path or 'home'})"
        # fall back to text near a telephone word
        for m in _TEXT.finditer(html):
            window = html[max(0, m.start() - 120):m.start()]
            if _NEAR.search(window):
                num = normalise(m.group(1))
                if num:
                    return tenant, num, f"page text ({path or 'home'})"
    return tenant, None, "not found"


if __name__ == "__main__":
    clubs = {c.tenant: c.club for c in COURSES}
    print(f"Looking for {len(clubs)} clubhouse numbers\n")

    found: dict[str, str] = {}
    if OUT.exists():                       # keep anything added by hand
        found.update(json.loads(OUT.read_text(encoding="utf-8")))

    with ThreadPoolExecutor(max_workers=8) as pool:
        for tenant, number, how in pool.map(find, sorted(clubs)):
            if number:
                found[tenant] = number
                print(f"  ok   {clubs[tenant]:<32} {number}   [{how}]")
            elif tenant in found:
                print(f"  kept {clubs[tenant]:<32} {found[tenant]}")
            else:
                print(f"  --   {clubs[tenant]:<32} {how}")

    OUT.write_text(json.dumps(found, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    missing = sorted(set(clubs) - set(found))
    print(f"\n{len(found)}/{len(clubs)} clubs have a number -> {OUT.relative_to(ROOT)}")
    if missing:
        print("still missing: " + ", ".join(missing))
