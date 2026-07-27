"""Download every course photo into the repo and serve them ourselves.

Hotlinking turned out to be unreliable: several club hosts began returning 403
once we had requested a few times, and the Google-hosted URLs are signed and
rotate. So each image is fetched once, downscaled, and committed to
assets/courses/<key>.jpg; the API serves those and the app never touches a
club's server.

    python -m tools.fetch_images            # fetch anything not already saved
    python -m tools.fetch_images --force    # re-fetch everything
"""
from __future__ import annotations

import io
import json
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import requests
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from teetimer.courses import COURSES  # noqa: E402
from tools.harvest_images import OVERRIDES, _rejected  # noqa: E402

requests.packages.urllib3.disable_warnings()

OUT = ROOT / "assets" / "courses"
MANIFEST = ROOT / "assets" / "course_images.json"
UA = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    # Several WordPress hosts answer 415 to an image-only Accept, and some want
    # a same-origin Referer before they will serve the file at all.
    "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
    "Accept-Language": "en-GB,en;q=0.9",
    "Sec-Fetch-Dest": "image",
    "Sec-Fetch-Mode": "no-cors",
    "Sec-Fetch-Site": "same-origin",
}


def _attempts(url: str) -> list[tuple[str, dict]]:
    """Progressively more browser-like requests, then a plaintext fallback for
    hosts whose TLS we cannot negotiate."""
    origin = "/".join(url.split("/")[:3])
    browserish = dict(UA, Referer=origin + "/",
                      Accept="text/html,application/xhtml+xml,image/avif,image/webp,*/*;q=0.8")
    return [
        (url, dict(UA, Referer=origin + "/")),
        (url, browserish),
        (url.replace("https://", "http://", 1), browserish),
    ]
MAX_W = 1280           # plenty for a full-bleed phone card at 3x
QUALITY = 82

# Supplied by hand, resolved from pages Cavan provided.
EXTRA: dict[str, str] = {
    # the club's own golf-course rendition, not the resort view og:image
    "quinta": "https://cache.marriott.com/content/dam/marriott-renditions/AGPWI/"
              "agpwi-golf-course-5595-hor-feat.jpg",
    "villapadierna": "https://www.villapadierna.es/content/thumbs/2040_/content/"
                     "imgsxml/img_menu/04-alferinigolf800.jpg",
    "calanova": "https://www.calanovagolf.es/web/img/slides/slide-6.jpg",
    "almenara": "https://altogolfclub.com/wp-content/uploads/2024/06/"
                "Almenara-Golf-–-the-Lagos-and-Pinos-Course.webp",
    # Miraflores stays absent. Its Wix gallery renders in JavaScript, and every
    # image reachable statically has been wrong on inspection: a screenshot of
    # its own home page, a group photo, and a boat moored on a marina.
    # Google Places photos. Signed URLs that rotate, which is precisely why we
    # save a copy rather than pointing the app at them.
    "paraiso": "https://lh3.googleusercontent.com/gps-cs-s/AHRPTWkNE-ErtCtqW70iLj-sV2Fa5c2I0q9G8"
               "sLrlcbmWoFjiUH8KD4k5CGfe3TfXkyQyzWZFZVJK6DUOiEXpm7Bm0G-t_XTm11xOMXjHHDYRHS2FRFgW"
               "chfjKigHT4ltgjswI1wLSk=s1360-w1360-h1020-rw",
    "chaparral": "https://lh3.googleusercontent.com/gps-cs-s/AHRPTWlXXHzEeLb-FaOS3uO0mgYAH89Xy-o"
                 "08qMr2FVqE5vymJDak4B2F4h6cjZmnQ-yWzkzFz6GhWIXf-8DjXQyg4kGl75bgOcziLthP7fjE7SWI"
                 "JIp57592pB3esvy6Qn4bKXV6kRUlg=s1360-w1360-h1020-rw",
    "canada": "https://lh3.googleusercontent.com/gps-cs-s/AHRPTWkMHk2pHTO5Z01hqBHdkIVH8xW0U7qwH7"
              "42MR5JvoBbL9PRlcZO07rW_FNG70Y-cyXWW3EigG9Hk9NEqSouBP8qNK-dge8tueerKa3ms94YAw2izQL"
              "DlkWnitXYFm2nfO-HwMJU=s1360-w1360-h1020-rw",
}


def sources() -> dict[str, str]:
    """Everything we know a URL for: the harvested manifest, plus overrides
    and hand-supplied pages, which win."""
    known: dict[str, str] = {}
    if MANIFEST.exists():
        known.update(json.loads(MANIFEST.read_text(encoding="utf-8")))
    known.update(OVERRIDES)
    known.update(EXTRA)
    # The manifest is both input and output here, so a URL rejected on sight
    # would otherwise survive forever by being read back in.
    return {k: v for k, v in known.items()
            if not v.startswith("/api/") and not _rejected(v)
            or (OUT / f"{k}.jpg").is_file()}


def grab(item: tuple[str, str]) -> tuple[str, str]:
    key, url = item
    dest = OUT / f"{key}.jpg"
    if dest.exists() and "--force" not in sys.argv:
        return key, f"kept ({dest.stat().st_size // 1024} KB)"
    last = "no attempt"
    for attempt_url, headers in _attempts(url):
        try:
            r = requests.get(attempt_url, headers=headers, timeout=45, verify=False)
            r.raise_for_status()
            img = Image.open(io.BytesIO(r.content)).convert("RGB")
            if img.width > MAX_W:
                img = img.resize((MAX_W, round(img.height * MAX_W / img.width)), Image.LANCZOS)
            dest.parent.mkdir(parents=True, exist_ok=True)
            img.save(dest, "JPEG", quality=QUALITY, optimize=True, progressive=True)
            return key, f"saved {img.width}x{img.height}  {dest.stat().st_size // 1024} KB"
        except Exception as e:
            last = f"{type(e).__name__}: {str(e)[:55]}"
    return key, f"FAILED {last}"


if __name__ == "__main__":
    clubs = {c.tenant: c.club for c in COURSES}
    todo = {k: v for k, v in sources().items() if k in clubs}
    print(f"Fetching {len(todo)} course photos into assets/courses/\n")

    with ThreadPoolExecutor(max_workers=8) as pool:
        for key, note in sorted(pool.map(grab, todo.items())):
            flag = "FAIL" if note.startswith("FAILED") else "ok  "
            print(f"  {flag} {clubs[key]:<32} {note}")

    saved = sorted(p.stem for p in OUT.glob("*.jpg")) if OUT.exists() else []

    # Hybrid on purpose. A club we could not download here may still serve its
    # image perfectly well to a phone -- our IP is the thing being filtered --
    # so keep the remote URL rather than dropping the photo entirely.
    manifest = {k: v for k, v in todo.items() if k not in saved}
    manifest.update({k: f"/api/image/{k}" for k in saved})
    MANIFEST.write_text(json.dumps(manifest, indent=2, sort_keys=True, ensure_ascii=False) + "\n",
                        encoding="utf-8")

    remote = len(manifest) - len(saved)
    print(f"\n{len(saved)} served by us, {remote} still hotlinked, "
          f"{len(clubs) - len(manifest)} drawing generated art")
    if remote:
        print("hotlinked (blocked from this IP): "
              + ", ".join(sorted(set(manifest) - set(saved))))
