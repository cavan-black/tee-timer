"""Collect one hero image URL per club, into assets/course_images.json.

The app references these at runtime rather than bundling copies, so nothing is
redistributed. Sources are tried in order of how clearly public they are:

1. The booking engine's own public image (hosted Golfmanager only -- the
   classic front-end serves images from /private/uploads and 401s).
2. The club site's ``og:image`` / ``twitter:image`` -- the picture a club
   publishes specifically so links to it render with a photo.
3. Nothing, and the app draws generated artwork instead.

    python -m tools.harvest_images [--check]
"""
from __future__ import annotations

import json
import re
import ssl
import sys
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

import requests  # noqa: E402

from teetimer.courses import COURSES  # noqa: E402
from teetimer.sites import SITES  # noqa: E402

OUT = ROOT / "assets" / "course_images.json"
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                    "(KHTML, like Gecko) Chrome/126.0 Safari/537.36"}
CTX = ssl.create_default_context()
CTX.check_hostname = False
CTX.verify_mode = ssl.CERT_NONE

_META = re.compile(
    r'<meta[^>]+(?:property|name)=["\'](?:og:image(?::secure_url)?|twitter:image)["\']'
    r'[^>]+content=["\']([^"\']+)["\']', re.I)
_META_REV = re.compile(
    r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+(?:property|name)='
    r'["\'](?:og:image(?::secure_url)?|twitter:image)["\']', re.I)


def _variants(url: str) -> list[str]:
    """Several clubs are on hosts that reject one scheme/host spelling but not
    another (503s on www, TLS resets on the apex, ...)."""
    host = url.split("//", 1)[-1].rstrip("/")
    bare = host[4:] if host.startswith("www.") else host
    seen, out = set(), []
    for h in (host, bare, "www." + bare):
        for scheme in ("https://", "http://"):
            candidate = scheme + h
            if candidate not in seen:
                seen.add(candidate)
                out.append(candidate)
    return out


def _get(url: str, timeout: int = 25) -> str:
    last: Exception | None = None
    for candidate in _variants(url):
        try:
            req = urllib.request.Request(candidate, headers=UA)
            with urllib.request.urlopen(req, timeout=timeout, context=CTX) as r:
                return r.read(900_000).decode("utf-8", "replace")
        except Exception as exc:
            last = exc
    raise last if last else RuntimeError("unreachable")


def _absolute(src: str, base: str) -> str:
    if src.startswith("//"):
        return "https:" + src
    if src.startswith("http"):
        return src
    host = "/".join(base.split("/")[:3])
    return host + ("" if src.startswith("/") else "/") + src


def from_site(tenant: str) -> str | None:
    base = SITES.get(tenant)
    if not base:
        return None
    try:
        html = _get(base)
    except Exception:
        return None
    match = _META.search(html) or _META_REV.search(html)
    if not match:
        return None
    # Plenty of sites point og:image at a logo or a "dummy" placeholder; those
    # look worse in a card than the generated artwork does.
    if _JUNK.search(match.group(1)):
        return None
    return _absolute(match.group(1), base)


# Most of these club sites are WordPress builds with no og:image at all, so
# fall back to the largest plausible photo on the home page.
_IMG = re.compile(r'(?:<img[^>]+(?:data-src|data-lazy-src|src)|background-image\s*:\s*url\()'
                  r'\s*=?\s*["\']?([^"\'\s)>]+\.(?:jpe?g|png|webp))', re.I)
_JUNK = re.compile(r"(logo|icon|favicon|sprite|avatar|badge|flag|bandera|placeholder|"
                   r"cookie|whatsapp|arrow|bullet|spinner|loader|pixel|blank|thumb|"
                   r"dummy|cgi-sys|404|coming-soon|default|no-image|ticket|banner-)", re.I)
_WIDTH = re.compile(r"(\d{3,4})x(\d{3,4})")


def _score(url: str) -> int:
    """Prefer big, photographic, hero-ish images."""
    score = 0
    dims = _WIDTH.search(url)
    if dims:
        w, h = int(dims.group(1)), int(dims.group(2))
        if w < 500 or h < 260:
            return -1
        score += min(w, 2400) // 100
    if re.search(r"(hero|slider|banner|header|cover|campo|course|hole|hoyo|green|aerial)", url, re.I):
        score += 12
    if "/uploads/" in url or "/media/" in url:
        score += 4
    if url.lower().endswith(".png"):
        score -= 3          # usually graphics rather than photography
    return score


def from_page_hero(tenant: str) -> str | None:
    base = SITES.get(tenant)
    if not base:
        return None
    try:
        html = _get(base)
    except Exception:
        return None
    ranked = []
    for raw in dict.fromkeys(_IMG.findall(html)):
        if _JUNK.search(raw):
            continue
        url = _absolute(raw.replace("&amp;", "&"), base)
        s = _score(url)
        if s >= 0:
            ranked.append((s, url))
    ranked.sort(reverse=True)
    for _, url in ranked[:6]:
        if verify(url):
            return url
    return None


def from_hosted_engine(tenant: str) -> str | None:
    """eu.golfmanager.com publishes its area artwork openly."""
    try:
        s = requests.Session()
        s.headers.update(UA)
        home = s.get(f"https://eu.golfmanager.com/{tenant}", timeout=25)
        rid = re.search(r'name="rid" content="([^"]+)"', home.text)
        if not rid:
            return None
        s.headers["rid"] = rid.group(1)
        data = s.get(f"https://eu.golfmanager.com/{tenant}/consumer/home.json",
                     timeout=25).json()
        for item in data.get("items") or []:
            if item.get("image"):
                return f"https://eu.golfmanager.com/{tenant}/{item['image'].lstrip('/')}"
    except Exception:
        return None
    return None


def verify(url: str) -> bool:
    """An og:image that 404s is worse than none -- the app would show a gap."""
    try:
        r = requests.head(url, headers=UA, timeout=20, allow_redirects=True, verify=False)
        if r.status_code >= 400 or "image" not in r.headers.get("content-type", ""):
            r = requests.get(url, headers=UA, timeout=20, stream=True, verify=False)
        return r.status_code < 400 and "image" in r.headers.get("content-type", "")
    except Exception:
        return False


def resolve(tenant: str) -> tuple[str, str | None, str]:
    for name, fn in (("engine", from_hosted_engine),
                     ("og:image", from_site),
                     ("hero", from_page_hero)):
        url = fn(tenant)
        if url and verify(url):
            return tenant, url, name
    return tenant, None, "none"


if __name__ == "__main__":
    requests.packages.urllib3.disable_warnings()  # we deliberately skip cert checks
    tenants = sorted({c.tenant for c in COURSES})
    print(f"Harvesting hero images for {len(tenants)} clubs\n")

    found: dict[str, str] = {}
    with ThreadPoolExecutor(max_workers=10) as pool:
        for tenant, url, source in pool.map(resolve, tenants):
            club = next(c.club for c in COURSES if c.tenant == tenant)
            if url:
                found[tenant] = url
                print(f"  ok   {club:<34} [{source}] {url[:78]}")
            else:
                print(f"  --   {club:<34} no public image; will use generated art")

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(found, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(f"\n{len(found)}/{len(tenants)} clubs have imagery -> {OUT.relative_to(ROOT)}")
