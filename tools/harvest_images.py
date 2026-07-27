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
    # og:image is whatever the club wants in a link preview -- often a logo, a
    # placeholder, the hotel, or a drawn course map. None of those are a photo
    # of the golf course, which is the only thing we want here.
    candidate = match.group(1)
    if _JUNK.search(candidate) or _NOT_COURSE.search(candidate) or _MAP.search(candidate):
        return None
    return _absolute(candidate, base)


# Most of these club sites are WordPress builds with no og:image, so photos are
# pulled from the page. The goal is specifically a picture OF THE GOLF COURSE --
# not the clubhouse, the hotel, a wedding, or a drawn hole-by-hole map.
_IMG = re.compile(r'(?:<img[^>]+(?:data-src|data-lazy-src|src)|background-image\s*:\s*url\()'
                  r'\s*=?\s*["\']?([^"\'\s)>]+\.(?:jpe?g|png|webp))', re.I)
_JUNK = re.compile(r"(logo|icon|favicon|sprite|avatar|badge|flag|bandera|placeholder|"
                   r"cookie|whatsapp|arrow|bullet|spinner|loader|pixel|blank|thumb|"
                   r"dummy|cgi-sys|404|coming-soon|default|no-image|ticket|banner-)", re.I)

# Not the course, however pretty: buildings, rooms, food, events, people.
_NOT_COURSE = re.compile(
    r"(hotel|room|suite|habitacion|spa|pool|piscina|restaurant|restaurante|bar\b|menu|"
    r"food|comida|wedding|boda|event|evento|gym|tennis|padel|villa|apartment|"
    r"apartamento|real-estate|inmobiliaria|shop|tienda|academy|academia|buggy|"
    r"trophy|team|staff|equipo|award|premio|news|noticia|clubhouse|casa-club|"
    r"reception|lobby|terrace|terraza|kids|junior|christmas|navidad|"
    # people and history, not turf: club sites love a designer portrait
    r"design|desiged|history|historia|arquitect|portrait|retrato|swing|player|jugador|"
    r"seve|ballesteros|profile|perfil|people|persona|lesson|clase|coach|pro-shop|"
    # a screenshot of the site itself, or generic marketing furniture
    r"screenshot|captura|home_|homepage|web-|mockup|slide-?\d+$)", re.I)

# Drawn layouts and yardage charts -- accurate, but not photography.
_MAP = re.compile(r"(map|mapa|plano|layout|yardage|scorecard|tarjeta|diagram|croquis|"
                  r"street|google|satellite|recorrido-plano)", re.I)

# Positive signals that this really is the playing surface.
_COURSE = re.compile(r"(hoyo|hole|campo|course|fairway|green(?!life)|tee\b|links|"
                     r"aerial|aerea|panoram|aerial|bunker|putting|golf-course|"
                     r"campo-de-golf|el-campo|18|par-?[345])", re.I)

_WIDTH = re.compile(r"(\d{3,4})x(\d{3,4})")

# Pages most likely to be wall-to-wall course photography.
_COURSE_PAGES = ("el-campo", "the-course", "campo", "course", "golf-course",
                 "en/the-course", "es/el-campo", "campo-de-golf", "our-course",
                 "the-golf-course", "hoyos", "holes", "galeria", "gallery")


def _score(url: str) -> int:
    """Rank candidates by how likely they are to be a photo of the course."""
    if _MAP.search(url) or _NOT_COURSE.search(url):
        return -1
    score = 0
    dims = _WIDTH.search(url)
    if dims:
        w, h = int(dims.group(1)), int(dims.group(2))
        if w < 640 or h < 320:
            return -1
        if w < h:
            return -1               # portrait crops are almost never the course
        score += min(w, 2400) // 120
    if _COURSE.search(url):
        score += 20
    if re.search(r"(hero|slider|banner|header|cover|home)", url, re.I):
        score += 6
    if "/uploads/" in url or "/media/" in url:
        score += 3
    if url.lower().endswith(".png"):
        score -= 6                  # usually graphics, maps or logos
    return score


def _candidates(html: str, base: str) -> list[tuple[int, str]]:
    ranked = []
    for raw in dict.fromkeys(_IMG.findall(html)):
        if _JUNK.search(raw):
            continue
        url = _absolute(raw.replace("&amp;", "&"), base)
        s = _score(url)
        if s >= 0:
            ranked.append((s, url))
    ranked.sort(reverse=True)
    return ranked


def from_page_hero(tenant: str) -> str | None:
    base = SITES.get(tenant)
    if not base:
        return None

    ranked: list[tuple[int, str]] = []
    # A dedicated course page beats the home page, which is usually a mix of
    # clubhouse, restaurant and property marketing.
    for path in ("", *_COURSE_PAGES):
        try:
            html = _get(f"{base.rstrip('/')}/{path}" if path else base)
        except Exception:
            continue
        bonus = 0 if not path else 25
        ranked += [(s + bonus, u) for s, u in _candidates(html, base)]
        if bonus and ranked:
            break   # found a real course page; its photos are good enough

    ranked.sort(reverse=True)
    seen = set()
    for _, url in ranked:
        if url in seen or _rejected(url):
            continue
        seen.add(url)
        if len(seen) > 8:
            break
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


# Hand-checked, for clubs where nothing on the site is machine-identifiable as
# the course. Every entry here has been looked at, not just filename-matched.
OVERRIDES: dict[str, str] = {
    "lareserva": "https://www.lareservaclubsotogrande.com/uploads_wp/uploads/2023/11/campo-golf.jpg",
    "valleromano": "https://valleromanogolf.com/wp-content/uploads/2026/06/"
                   "Hoyo-3-Valle-Romano-Golf-Resort-Estepona-Costa-del-Sol-1-2.jpg",
    "lacala": "https://www.lacala.com/wp-content/uploads/2025/01/"
              "GREEN_11TH_EUROPA_PAR_5-Custom-864x517.jpg",
    "brisas": "https://realclubdegolflasbrisas.com/wp-content/uploads/2022/03/RCGB-HOME-2.jpg",
    "arqueros": "https://www.losarquerosgolf.com/wp-content/uploads/revslider/rsl11/lag-slider-5.jpg",
    "santaclaramarbella": "https://santaclaragolfmarbella.com/wp-content/uploads/2025/01/"
                          "santaclara_home_bg2.jpg",
    # Harvested and checked by eye, then pinned here. These live in code rather
    # than only in the manifest because tools/fetch_images.py both reads and
    # rewrites the manifest -- an early version of it dropped these five.
    "aloha": "https://www.clubdegolfaloha.com/wp-content/uploads/2021/04/The-course.jpg",
    "atalaya": "https://www.atalaya-golf.com/wp-content/uploads/2019/10/Hole-7-OC.jpg",
    "azata": "https://azatagolf.com/wp-content/uploads/2026/04/Azata-Golf-Hoyo-9.png",
    "lauro": "https://www.laurogolf.com/wp-content/uploads/2015/05/IMG_3770-3-compressed1.jpg",
    "sanroqueclub": "https://sanroqueclub.com/wp-content/uploads/2022/04/old-course2-1024x576.jpg",
    "arqueros": "https://www.losarquerosgolf.com/wp-content/uploads/revslider/rsl11/lag-slider-5.jpg",
    "brisas": "https://realclubdegolflasbrisas.com/wp-content/uploads/2022/03/RCGB-HOME-2.jpg",
    "valleromano": "https://valleromanogolf.com/wp-content/uploads/2026/06/"
                   "Hoyo-3-Valle-Romano-Golf-Resort-Estepona-Costa-del-Sol-1-2.jpg",

    # Supplied by hand. Both come off the Marbella Club group's own CDN, which
    # is a far steadier host than elhigueralgolf.com, whose TLS is broken.
    "marbellaclub": "https://image-tc.galaxy.tf/wijpeg-8n49iibxwoe5wkaqliy0mzu8y/"
                    "mbc-8-approach.jpg",
    "elhigueral": "https://image-tc.galaxy.tf/wijpeg-5cymmyc4z0jpfpkxd7b9ax4w9/"
                  "higueral-green-6.jpg",

    # Deliberately absent, all checked by eye and rejected:
    #   calanova   - the only scrapable "th-18" image is a clubhouse interior
    #   noria      - a flat drawn hole diagram, not a photograph
    #   elhigueral - its one course photo sits behind a broken TLS handshake,
    #                so a phone could not load it either
    # These fall back to the drawn course scene, like the other clubs whose
    # sites publish nothing usable.
    # Miraflores is deliberately absent: its Wix site renders the gallery in
    # JavaScript, so nothing reachable statically is actually the course --
    # every candidate was a screenshot, a group photo, or a portrait. It gets
    # generated artwork instead of a wrong photograph.
}

# Reviewed via `python -m tools.contact_sheet` and rejected on sight: a drawn
# course map, the Ronda bridge, a Seve Ballesteros portrait, a screenshot of
# the club's own website, a golfer mid-swing, and a valley panorama.
REJECTED: set[str] = {
    "https://azatagolf.com/wp-content/uploads/2026/04/azata-golf-campo-imagen.png",
    "https://www.lareservaclubsotogrande.com/uploads_wp/uploads/2023/11/"
    "image-2018-12-13-4-e1708337767816.jpg",
    "https://www.losarquerosgolf.com/wp-content/uploads/2015/05/Golf-Designer-history.jpg",
    "https://www.losarquerosgolf.com/wp-content/uploads/2019/03/"
    "first-golf-course-desiged-by-2.png",
    "https://valleromanogolf.com/wp-content/uploads/2025/08/"
    "Valle-Romano-Golf-a-Must-Play-Course-on-the-Costa-del-Sol-3-1-768x512.webp",
    "https://realclubdegolflasbrisas.com/wp-content/uploads/2016/06/the-course-about.jpg",
    # resort/real-estate aerial rather than the playing surface
    "https://www.lacala.com/wp-content/uploads/2025/01/Sunrise_LCR-Custom-1024x614.jpg",
    # sponsors' backdrop group photo
    "https://santaclaragolfmarbella.com/wp-content/uploads/2026/06/schusterandfriends1.jpg",
    # a boat moored on a marina -- Miraflores' og:image
    "https://static.wixstatic.com/media/662272_9964259ec1ee45eeb9bed14fcf0e2348~mv2.jpg",
}

# Everything Miraflores serves statically from Wix is a screenshot of its own
# home page, a group photo, or a portrait -- never the course. Size-mangled
# Wix paths defeat stem matching, so block the whole media prefix.
REJECTED_HOSTS_PREFIX = ("https://static.wixstatic.com/media/662272_",
                         "https://static.wixstatic.com/media/f305a5_",
                         "https://static.wixstatic.com/media/b3b36a_")


def _stem(url: str) -> str:
    """Drop the query string, any WordPress -WxH suffix, and the extension, so
    one rejection covers every rendition of the same picture."""
    path = url.split("?")[0]
    path = re.sub(r"-\d{2,4}x\d{2,4}(?=\.\w+$)", "", path)
    return re.sub(r"\.\w+$", "", path)


_REJECTED_STEMS = {_stem(u) for u in REJECTED}


def _rejected(url: str) -> bool:
    return (_stem(url) in _REJECTED_STEMS
            or url.startswith(REJECTED_HOSTS_PREFIX))


def resolve(tenant: str) -> tuple[str, str | None, str]:
    if tenant in OVERRIDES:
        url = OVERRIDES[tenant]
        return tenant, (url if verify(url) else None), "override"
    for name, fn in (("engine", from_hosted_engine),
                     ("og:image", from_site),
                     ("hero", from_page_hero)):
        url = fn(tenant)
        if url and not _rejected(url) and verify(url):
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
