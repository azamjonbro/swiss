#!/usr/bin/env python3
"""Pulls a brand's catalogue from its own website into this project.

One module per brand, because no two of these sites are built the same way:
Tissot and Citizen are Salesforce Commerce storefronts, Seiko is Sitecore,
Saint Honoré is WooCommerce, Jacques Philippe and West End are hand-built.
What they share is the output — a `<brand>-import.json` next to seed.ts and
photography in `src/uploads/images/` — so `importBrandCatalog.ts` can load any
of them the same way.

Only facts the brand itself publishes are recorded: reference, series, price,
spec sheet, photography. A field the site does not state is left empty rather
than guessed, and product copy is composed from those stored fields by the
importer, never invented here.

    python3 scripts/fetch-brand.py tissot            # one brand
    python3 scripts/fetch-brand.py all               # every brand below
    python3 scripts/fetch-brand.py seiko --limit 5   # a sample, for checking

Re-running is cheap: pages are cached under `.brand-cache/` and an image
already on disk is never downloaded twice.
"""

from __future__ import annotations

import argparse
import hashlib
import io
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable, Iterable

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
IMAGES = ROOT / "src" / "uploads" / "images"
SEED = ROOT / "src" / "seed"
CACHE = ROOT / ".brand-cache"

UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
)

# The storefront stores every price in USD and converts for display with this
# fixed rate (frontend/src/stores/currency.ts). Dividing a manufacturer's EUR
# price by the same rate means the site shows that exact EUR figure back.
EUR_TO_USD = 1 / 0.92

# Some of these sites answer slowly under load; one retry pass is enough to
# ride out the occasional 500 without hammering them.
RETRIES = 3
PAUSE = 0.4


# --------------------------------------------------------------------------
# fetching
# --------------------------------------------------------------------------

class Session:
    """A cookie-keeping fetcher with an on-disk page cache.

    Tissot and Jacques Philippe both 302-loop or 500 until a session cookie is
    set, so cookies are kept across requests rather than sent per call.
    """

    def __init__(self, name: str, headers: dict[str, str] | None = None):
        self.dir = CACHE / name
        self.dir.mkdir(parents=True, exist_ok=True)
        self.opener = urllib.request.build_opener(
            urllib.request.HTTPCookieProcessor(),
            urllib.request.HTTPRedirectHandler(),
        )
        self.headers = {
            "User-Agent": UA,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            **(headers or {}),
        }

    def get(self, url: str, cache: bool = True, binary: bool = False) -> bytes | None:
        key = hashlib.sha1(url.encode()).hexdigest()
        path = self.dir / f"{key}.bin"
        if cache and path.exists():
            return path.read_bytes()
        last: Exception | None = None
        for attempt in range(RETRIES):
            try:
                req = urllib.request.Request(url, headers=self.headers)
                with self.opener.open(req, timeout=45) as resp:
                    body = resp.read()
                if cache:
                    path.write_bytes(body)
                time.sleep(PAUSE)
                return body
            except Exception as exc:  # noqa: BLE001 - any transport error is a retry
                last = exc
                time.sleep(1.5 * (attempt + 1))
        print(f"  ! {url}: {last}", file=sys.stderr)
        return None

    def text(self, url: str, cache: bool = True) -> str:
        body = self.get(url, cache=cache)
        return body.decode("utf-8", "ignore") if body else ""

    def json(self, url: str, cache: bool = True) -> object | None:
        body = self.get(url, cache=cache)
        if not body:
            return None
        try:
            return json.loads(body)
        except json.JSONDecodeError:
            return None


# --------------------------------------------------------------------------
# text and image helpers
# --------------------------------------------------------------------------

def slugify(value: str) -> str:
    value = value.lower().replace("&", " and ")
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return value.strip("-")


def clean(text: str) -> str:
    """Strips tags and entities from a fragment of markup and squeezes space."""
    text = re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", text, flags=re.S | re.I)
    text = re.sub(r"<br\s*/?>", " ", text, flags=re.I)
    text = re.sub(r"<[^>]+>", " ", text)
    text = (
        text.replace("&nbsp;", " ")
        .replace("&amp;", "&")
        .replace("&quot;", '"')
        .replace("&#039;", "'")
        .replace("&#8220;", '"')
        .replace("&#8221;", '"')
        .replace("&reg;", "")
    )
    return re.sub(r"\s+", " ", text).strip()


def save_image(session: Session, url: str, stem: str) -> str | None:
    """Downloads one photo, flattens it onto white, and stores it as JPEG.

    Named `<stem>.<content hash>.jpg` like the rest of the catalogue, so a
    replaced photo lands on a new path instead of hiding behind the resize
    cache, which keys on path rather than contents.
    """
    body = session.get(url, binary=True)
    if not body or len(body) < 1024:
        return None
    try:
        src = Image.open(io.BytesIO(body))
        src.load()
    except Exception:  # noqa: BLE001 - a 404 page served as an image, say
        return None
    if src.mode in ("RGBA", "LA", "P"):
        src = src.convert("RGBA")
        flat = Image.new("RGB", src.size, (255, 255, 255))
        flat.paste(src, mask=src.split()[-1])
        src = flat
    else:
        src = src.convert("RGB")
    if max(src.size) > 1600:
        src.thumbnail((1600, 1600), Image.LANCZOS)
    buf = io.BytesIO()
    src.save(buf, "JPEG", quality=86, optimize=True, progressive=True)
    data = buf.getvalue()
    digest = hashlib.sha256(data).hexdigest()[:8]
    name = f"{stem}.{digest}.jpg"
    path = IMAGES / name
    if not path.exists():
        path.write_bytes(data)
    return f"/uploads/images/{name}"


def collect_images(session: Session, urls: Iterable[str], stem: str, cap: int = 6) -> list[str]:
    out: list[str] = []
    seen: set[str] = set()
    for url in urls:
        if len(out) >= cap:
            break
        if url in seen:
            continue
        seen.add(url)
        stored = save_image(session, url, f"{stem}-{len(out) + 1}")
        if stored and stored not in out:
            out.append(stored)
    return out


def product(**kwargs) -> dict:
    """One catalogue entry, with every field the importer expects present."""
    entry = {
        "reference": "",
        "name": "",
        "series": "",
        "gender": "men",
        "price": 0.0,
        "movement": "",
        "caseMaterial": "",
        "caseSize": "",
        "dial": "",
        "bracelet": "",
        "waterResistance": "",
        # The brand's own copy when it publishes any; the importer composes a
        # spec-sheet sentence for the products that have none.
        "description": "",
        "images": [],
        "sourceUrl": "",
    }
    entry.update(kwargs)
    return entry


def write_catalog(brand: str, source: str, items: list[dict], slug: str = "") -> Path:
    items = [i for i in items if i["images"]]
    out = SEED / f"{slug or slugify(brand)}-import.json"
    out.write_text(
        json.dumps(
            {
                "brand": brand,
                "source": source,
                "fetchedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
                "currency": "USD",
                "products": items,
            },
            indent=2,
            ensure_ascii=False,
        )
        + "\n",
        encoding="utf-8",
    )
    print(f"  → {out.relative_to(ROOT)}: {len(items)} products")
    return out


def spec_pairs(lines: list[str], labels: set[str]) -> dict[str, str]:
    """Reads a flattened spec sheet, where each label is followed by its value."""
    out: dict[str, str] = {}
    for i, line in enumerate(lines[:-1]):
        if line in labels and line not in out:
            value = lines[i + 1]
            if value not in labels:
                out[line] = value
    return out


# --------------------------------------------------------------------------
# Tissot — Salesforce Commerce; the grid endpoint pages the whole catalogue
# and every product page carries a JSON-LD Product plus a full spec sheet.
# --------------------------------------------------------------------------

TISSOT_BASE = "https://www.tissotwatches.com"
TISSOT_GRID = (
    TISSOT_BASE + "/on/demandware.store/Sites-NonTransactional-Site/en/"
    "Search-UpdateGrid?cgid=tis-{gender}&start=0&sz=600"
)
TISSOT_LABELS = {
    "SKU", "Water resistance", "Case material", "Case options", "Bezel material",
    "Crystal", "Movement", "Power reserve (hours)", "Main Functions", "Dial colour",
    "Indexes type", "Strap material", "Strap colour", "Buckle", "Bracelet option",
    "Length (mm)", "Width (mm)", "Thickness (mm)", "Country of manufacture",
}


def fetch_tissot(limit: int | None) -> None:
    session = Session("tissot")
    session.text(TISSOT_BASE + "/en-en")  # sets the locale cookie the grid needs

    urls: dict[str, str] = {}
    for gender in ("men", "women"):
        grid = session.text(TISSOT_GRID.format(gender=gender))
        for path in sorted(set(re.findall(r'href="(/en-en/T\d+\.html)"', grid))):
            urls.setdefault(TISSOT_BASE + path, gender)
    print(f"  {len(urls)} product pages")

    items: list[dict] = []
    for n, (url, gender) in enumerate(list(urls.items())[:limit], 1):
        html = session.text(url)
        if not html:
            continue
        ld = next(
            (
                json.loads(block)
                for block in re.findall(
                    r'type="application/ld\+json"[^>]*>(.*?)</script>', html, re.S
                )
                if '"Product"' in block
            ),
            None,
        )
        if not ld:
            continue
        flat = [
            clean(line)
            for line in re.sub(
                r"<[^>]+>", "\n", re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", html, flags=re.S)
            ).split("\n")
        ]
        flat = [line for line in flat if line]
        specs = spec_pairs(flat, TISSOT_LABELS)

        sku = ld.get("sku") or ""
        name = re.sub(r"^Tissot\s+", "", ld.get("name") or "").strip()
        price_eur = float((ld.get("offers") or {}).get("price") or 0)


        water = specs.get("Water resistance", "")
        bar = re.search(r"(\d+)\s*bar", water)
        metres = re.search(r"\((\d+)\s*m\b", water)
        if bar and metres:
            water = f"{bar.group(1)} bar ({metres.group(1)} m)"

        diameter = specs.get("Width (mm)") or specs.get("Length (mm)") or ""
        diameter = diameter.replace(",", ".").rstrip("0").rstrip(".")

        strap = ", ".join(v for v in (specs.get("Strap material"), specs.get("Buckle")) if v)

        # The copy sits between the "Description" heading and the spec sheet.
        blurb = ""
        if "Description" in flat and "About the watch" in flat:
            span = flat[flat.index("Description") + 1 : flat.index("About the watch")]
            longest = max(span, key=len, default="")
            blurb = longest if len(longest) > 80 else ""

        stem = f"tissot-{slugify(name)}-{slugify(sku)}"
        # The printed reference is the dotted form of the SKU (T137.207.11.041.00).
        # Asset names punctuate the reference as T137_207_11_041_00 or
        # T137-207-11-041-00; anything else on the page is a strap or a shadow.
        parts = re.match(r"(T\d{3})(\d{3})(\d{2})(\d{3})(\d{2})", sku)
        keys = ["_".join(parts.groups()), "-".join(parts.groups())] if parts else [sku]
        dotted = ".".join(parts.groups()) if parts else sku
        # Every asset is offered at a dozen widths behind query strings; the bare
        # URL is the full-resolution original. Front shot first, then profile,
        # detail and wrist; the "shadow" cut-out is a card treatment, not a photo.
        raw = dict.fromkeys(
            u.replace("&amp;", "&").split("?")[0]
            for u in re.findall(r'https://www\.tissotwatches\.com/dw/image/[^"\s]+', html)
        )
        photos = sorted(
            (u for u in raw if "_shadow" not in u and any(k in u for k in keys)),
            key=lambda u: next(
                (i for i, tag in enumerate(TISSOT_VIEWS, 1) if tag in u.rsplit("/", 1)[-1].upper()),
                0,
            ),
        )
        images = collect_images(session, photos, stem, cap=4)

        items.append(
            product(
                reference=dotted or sku,
                name=name,
                series=next((c for c in TISSOT_SERIES if c.lower() in name.lower()), ""),
                gender=gender,
                price=round(price_eur * EUR_TO_USD) if price_eur else 0.0,
                movement=specs.get("Movement", ""),
                caseMaterial=specs.get("Case material", ""),
                caseSize=f"{diameter} mm" if diameter else "",
                dial=specs.get("Dial colour", ""),
                bracelet=strap,
                waterResistance=water,
                description=blurb,
                images=images,
                sourceUrl=url,
            )
        )
        if n % 25 == 0:
            print(f"  {n}/{len(urls)}")
    write_catalog("Tissot", TISSOT_BASE + "/en-en", items)


TISSOT_VIEWS = ("PROFIL", "_DETAIL", "_B1", "_WRIST")  # matched upper-cased

TISSOT_SERIES = [
    "PRX", "Seastar", "Gentleman", "PRC 100", "Ballade", "Visodate", "Le Locle",
    "Classic Dream", "T-Race", "PR516", "PR 100", "Chemin des Tourelles", "Carson",
    "Everytime", "Bellissima", "Lovely", "Desir", "SRV", "T-Touch", "Heritage",
    "Supersport", "Sideral", "T-Classic", "Excellence", "Couturier", "Odaci",
]


# --------------------------------------------------------------------------
# Seiko — Sitecore; every product page is listed in the US sitemap and carries
# its spec sheet as plain markup, with the suggested retail price in USD.
# --------------------------------------------------------------------------

SEIKO_BASE = "https://www.seikowatches.com"
SEIKO_SITEMAP = SEIKO_BASE + "/vendor/sitemap?xml=us-enSeikoSitemap1.xml"
SEIKO_LABELS = {
    "Caliber Number", "Movement Type", "Precision", "Power reserve", "Jewels",
    "Case Material", "Crystal", "Crystal Coating", "Clasp", "Band Material",
    "Band Color", "Water Resistance", "Magnetic Resistance", "Weight", "Dial Color",
    "Bezel Material", "Functions",
}


def fetch_seiko(limit: int | None) -> None:
    session = Session("seiko")
    sitemap = session.text(SEIKO_SITEMAP)
    urls = [
        u
        for u in re.findall(r"<loc>([^<]+)</loc>", sitemap)
        if re.search(r"/us-en/products/[^/]+/[a-z]{2,4}\d{2,4}[a-z]?\d?$", u)
    ]
    print(f"  {len(urls)} candidate pages")

    items: list[dict] = []
    for n, url in enumerate(urls[:limit], 1):
        html = session.text(url)
        if "productInformation" not in html:
            continue
        block = html[html.index(">", html.index("productInformation")) + 1 :]
        block = block[: block.find("Most Viewed") or len(block)]
        flat = [
            clean(line)
            for line in re.sub(
                r"<[^>]+>", "\n", re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", block, flags=re.S)
            ).split("\n")
        ]
        flat = [line for line in flat if line]

        price = next(
            (float(m.group(1).replace(",", "")) for m in (re.search(r"USD\s*([\d,]+\.\d{2})", " ".join(flat)),) if m),
            0.0,
        )
        gender = "women" if any(l.startswith("Women") for l in flat[:4]) else "men"
        # The block opens with audience, reference, collection and series.
        head = [l for l in flat[:6] if l not in ("Men's", "Women's", "Unisex")]
        reference = head[0] if head else ""
        if not re.match(r"^[A-Z]{2,4}\d{2,4}[A-Z]?\d?$", reference):
            continue
        collection = head[1] if len(head) > 1 else ""
        series = head[2] if len(head) > 2 and not head[2].startswith("USD") else ""

        specs = spec_pairs(flat, SEIKO_LABELS)
        joined = " ".join(flat)
        diameter = re.search(r"Diameter:\s*([\d.]+\s*mm)", joined)
        movement = ", ".join(
            v for v in (specs.get("Movement Type"), specs.get("Caliber Number")) if v
        )
        water = specs.get("Water Resistance", "")

        # "Presage" + "Cocktail Time" is how the brand names the model; the
        # reference stays in its own field rather than in the title.
        name = " ".join(p for p in (collection, series) if p) or reference
        stem = f"seiko-{slugify(reference)}"
        photos = [
            SEIKO_BASE + u.replace("&amp;", "&").split("?")[0] if u.startswith("/") else u.replace("&amp;", "&").split("?")[0]
            for u in re.findall(r'(?:src|content)="([^"]*Product--Image[^"]*)"', html)
            if reference.lower() in u.lower()
        ]
        images = collect_images(session, photos, stem, cap=4)

        items.append(
            product(
                reference=reference,
                name=name,
                series=collection,
                gender=gender,
                price=price,
                movement=movement,
                caseMaterial=specs.get("Case Material", ""),
                caseSize=diameter.group(1) if diameter else "",
                dial=specs.get("Dial Color", ""),
                bracelet=", ".join(
                    v for v in (specs.get("Band Material"), specs.get("Clasp")) if v
                ),
                waterResistance=water,
                images=images,
                sourceUrl=url,
            )
        )
        if n % 25 == 0:
            print(f"  {n}/{len(urls)}")
    write_catalog("Seiko", SEIKO_BASE + "/us-en", items)


# --------------------------------------------------------------------------
# Citizen — a Salesforce Commerce PWA. Every page ships its React Query cache
# inline, so the product record (spec sheet, price, photography) is read from
# that JSON rather than scraped out of the rendered markup.
# --------------------------------------------------------------------------

CITIZEN_BASE = "https://www.citizenwatch.com"


def preloaded_state(html: str) -> dict | None:
    """Pulls `window.__PRELOADED_STATE__` out of a page by brace matching."""
    marker = html.find('"__PRELOADED_STATE__"')
    if marker < 0:
        return None
    depth, start = 0, None
    for i in range(html.index(":", marker) + 1, len(html)):
        char = html[i]
        if char == "{":
            depth += 1
            if start is None:
                start = i
        elif char == "}":
            depth -= 1
            if depth == 0:
                try:
                    return json.loads(html[start : i + 1])
                except json.JSONDecodeError:
                    return None
    return None


def fetch_citizen(limit: int | None) -> None:
    session = Session("citizen")

    refs: dict[str, str] = {}
    for gender, path in (("men", "mens"), ("women", "womens")):
        offset = 0
        while True:
            page = session.text(f"{CITIZEN_BASE}/us/en/collection/{path}?offset={offset}")
            found = sorted(set(re.findall(r"/us/en/product/([A-Z0-9][A-Z0-9\-]+)", page)))
            fresh = [r for r in found if r not in refs]
            for ref in fresh:
                refs[ref] = gender
            if not fresh or offset > 1200:
                break
            offset += 48
    print(f"  {len(refs)} products")

    items: list[dict] = []
    for n, (ref, gender) in enumerate(list(refs.items())[:limit], 1):
        html = session.text(f"{CITIZEN_BASE}/us/en/product/{ref}.html")
        state = preloaded_state(html)
        if not state:
            continue
        record = next(
            (
                q["state"]["data"]
                for q in state.get("__reactQuery", {}).get("queries", [])
                if isinstance(q.get("state", {}).get("data"), dict)
                and "imageGroups" in q["state"]["data"]
            ),
            None,
        )
        if not record or not record.get("price"):
            continue

        water = record.get("c_waterResistance", "")
        wr = re.match(r"WR(\d+)/(\d+)\s*Bar", water, re.I)
        if wr:
            water = f"{wr.group(2)} bar ({wr.group(1)} m)"

        band = ", ".join(
            v for v in (record.get("c_bandMaterial"), record.get("c_claspType")) if v
        )
        movement = " ".join(
            v for v in (record.get("c_movementTechnology"), record.get("c_movement")) if v
        )
        photos = [
            img["link"]
            for group in record.get("imageGroups", [])
            for img in group.get("images", [])
            if img.get("link")
        ]
        stem = f"citizen-{slugify(ref)}"

        items.append(
            product(
                reference=ref,
                name=record.get("c_collectionName") or record.get("name") or ref,
                series=record.get("c_PDCollection2", ""),
                gender="women" if str(record.get("c_gender", "")).lower().startswith("wom") else gender,
                price=float(record["price"]),
                movement=movement,
                caseMaterial=record.get("c_caseMaterial", ""),
                caseSize=f"{record['c_caseWidth']} mm" if record.get("c_caseWidth") else "",
                dial=record.get("c_dialColor", ""),
                bracelet=band,
                waterResistance=water,
                description=clean(record.get("longDescription") or ""),
                images=collect_images(session, photos, stem, cap=4),
                sourceUrl=f"{CITIZEN_BASE}/us/en/product/{ref}.html",
            )
        )
        if n % 25 == 0:
            print(f"  {n}/{len(refs)}")
    write_catalog("Citizen", CITIZEN_BASE + "/us/en", items)


# --------------------------------------------------------------------------
# Saint Honoré — WooCommerce. The Store API gives the catalogue, photography
# and references; the spec sheet and copy are read off the product page, where
# the maison lists them as a short block of upper-case lines.
#
# The site is a showcase, not a shop: every price it reports is zero. Those
# products import deactivated, for the shop to price in the admin panel.
# --------------------------------------------------------------------------

SAINT_HONORE_BASE = "https://www.sainthonore.com"
SAINT_HONORE_WATCH_CATEGORIES = {"watches", "mens-watches", "womens-watches"}
MINOR_WORDS = {"de", "du", "la", "le", "des", "of", "and", "the", "a"}


def title_case(value: str) -> str:
    words = value.strip().lower().split()
    return " ".join(
        w if i and w in MINOR_WORDS else w[:1].upper() + w[1:] for i, w in enumerate(words)
    )


def fetch_sainthonore(limit: int | None) -> None:
    session = Session("sainthonore")

    catalogue: list[dict] = []
    for page in range(1, 8):
        batch = session.json(
            f"{SAINT_HONORE_BASE}/wp-json/wc/store/products?per_page=100&page={page}"
        )
        if not isinstance(batch, list) or not batch:
            break
        catalogue.extend(batch)
    watches = [
        p
        for p in catalogue
        if any(c["slug"] in SAINT_HONORE_WATCH_CATEGORIES for c in p.get("categories", []))
    ]
    print(f"  {len(watches)} watches of {len(catalogue)} products")

    items: list[dict] = []
    for n, entry in enumerate(watches[:limit], 1):
        slugs = {c["slug"] for c in entry.get("categories", [])}
        html = session.text(entry["permalink"])
        flat = [
            clean(line)
            for line in re.sub(
                r"<[^>]+>", "\n", re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", html, flags=re.S)
            ).split("\n")
        ]
        flat = [line for line in flat if line]

        specs: list[str] = []
        if "Specifications:" in flat:
            for line in flat[flat.index("Specifications:") + 1 :]:
                if not line.isupper() or len(specs) >= 8:
                    break
                specs.append(line)
        blurb = ""
        if "Description" in flat:
            after = flat[flat.index("Description") + 1 :]
            blurb = next((line for line in after[:4] if len(line) > 80), "")

        def spec(*needles: str, drop: str = "") -> str:
            """One spec line, title-cased, without the noun it ends with.

            The maison writes them as "BLUE LEATHER STRAP" / "SEE THROUGH DIAL",
            so the trailing noun repeats the field it lands in.
            """
            hit = next((s for s in specs if any(nee in s for nee in needles)), "")
            if not hit:
                return ""
            if drop:
                hit = re.sub(rf"\s*{drop}$", "", hit, flags=re.I)
            return re.sub(r"\bIp\b", "IP", title_case(hit))

        case_line = spec("CASE", drop="CASE")
        size = re.search(r"(\d{2}(?:\.\d)?)\s*mm", case_line, re.I)
        water = spec("WATER RESISTANCE", drop="WATER RESISTANCE")
        atm = re.search(r"(\d+)\s*atm", water, re.I)

        stem = f"saint-honore-{slugify(entry['sku'] or entry['slug'])}"
        images = collect_images(
            session, [i["src"] for i in entry.get("images", [])], stem, cap=4
        )

        items.append(
            product(
                reference=entry["sku"],
                name=title_case(entry["name"]),
                series=title_case(entry["name"]),
                gender="women" if "womens-watches" in slugs else "men",
                price=float(entry["prices"]["price"] or 0) / 100,
                movement=spec("MOVEMENT", drop="MOVEMENT"),
                caseMaterial=re.sub(r"^\d{2}(\.\d)?mm\s*", "", case_line, flags=re.I),
                caseSize=f"{size.group(1)} mm" if size else "",
                dial=spec("DIAL", drop="DIAL"),
                bracelet=spec("STRAP", "BRACELET"),
                waterResistance=f"{atm.group(1)} ATM" if atm else water,
                description=blurb,
                images=images,
                sourceUrl=entry["permalink"],
            )
        )
        if n % 25 == 0:
            print(f"  {n}/{len(watches)}")
    write_catalog("Saint Honoré", SAINT_HONORE_BASE, items, slug="saint-honore")


# --------------------------------------------------------------------------
# Jacques Philippe — a hand-built ASP.NET catalogue. It lists no model names
# and no prices, only stock codes, a spec sheet and photography, so the stock
# code is the product name and the entries import deactivated for pricing.
# --------------------------------------------------------------------------

JP_BASE = "https://www.jacquesphilippe.com"


def fetch_jacquesphilippe(limit: int | None) -> None:
    session = Session("jacquesphilippe")
    session.text(JP_BASE + "/")  # the catalogue 500s without a session cookie

    codes: dict[str, str] = {}
    for collection, gender in (("10", "men"), ("11", "women")):
        page = session.text(f"{JP_BASE}/Product/List?collectionIds={collection}")
        for code in sorted(set(re.findall(r'data-code="([A-Z0-9]+)"', page))):
            codes.setdefault(code, gender)
    print(f"  {len(codes)} products")

    items: list[dict] = []
    for n, (code, gender) in enumerate(list(codes.items())[:limit], 1):
        url = f"{JP_BASE}/Product/Detail?StockCode={code}"
        html = session.text(url)
        if "watch-details" not in html:
            continue
        block = html[html.index("watch-details") :]
        lines = [
            clean(line)
            for line in re.sub(
                r"<[^>]+>", "\n", re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", block, flags=re.S)
            ).split("\n")
        ]
        lines = [
            line
            for line in lines
            if line and line not in {code, "Watch-Details", "Case", "Movement", "Features"}
        ]

        def line_with(*needles: str) -> str:
            return next(
                (l for l in lines if any(nee in l.lower() for nee in needles)),
                "",
            )

        diameter = re.search(r"Case Diameter:\s*([0-9]+(?:[Xx×][0-9]+)?)\s*mm", " ".join(lines))
        water = re.search(r"([0-9]+)\s*ATM\s*\(([0-9]+)m\)", " ".join(lines), re.I)
        case_lines = [
            l
            for l in lines
            if l.lower().endswith("case") and not l.lower().startswith("round")
        ]
        movement = ", ".join(
            dict.fromkeys(
                l.replace("Swiss Movement: ", "")
                for l in lines
                if "movement" in l.lower() or l.lower() == "swiss made"
            )
        )
        strap = line_with("strap", "bracelet")

        photos = [
            f"{JP_BASE}/img/urunler/{name}"
            for name in dict.fromkeys(re.findall(r'/img/urunler/([^"\']+\.jpg)', html))
        ]
        items.append(
            product(
                reference=code,
                name=code,
                series="",
                gender=gender,
                price=0.0,
                movement=movement,
                caseMaterial=", ".join(re.sub(r"\s*case$", "", l, flags=re.I) for l in case_lines),
                caseSize=(diameter.group(1).replace("X", " × ").replace("x", " × ") + " mm")
                if diameter
                else "",
                dial=line_with("dial"),
                bracelet=strap,
                waterResistance=f"{water.group(1)} ATM ({water.group(2)} m)" if water else "",
                images=collect_images(session, photos, f"jacques-philippe-{slugify(code)}", cap=4),
                sourceUrl=url,
            )
        )
        if n % 25 == 0:
            print(f"  {n}/{len(codes)}")
    write_catalog("Jacques Philippe", JP_BASE, items, slug="jacques-philippe")


# --------------------------------------------------------------------------
# West End Watch Co. — a static site where each collection page lists its
# models as one entry per reference, with the spec sheet written as a few
# free-text lines. No prices are published, so these import deactivated too.
# --------------------------------------------------------------------------

WEST_END_BASE = "https://www.westendwatchco.ch"


def fetch_westend(limit: int | None) -> None:
    session = Session("westend")
    sitemap = session.text(WEST_END_BASE + "/data/System/sitemap.xml")
    pages = dict.fromkeys(
        u.replace("https://westendwatchco.ch", WEST_END_BASE)
        for u in re.findall(r"<loc>([^<]+)</loc>", sitemap)
        if "/the-collection/" in u
    )
    print(f"  {len(pages)} collection pages")

    items: list[dict] = []
    for url in pages:
        html = session.text(url)
        for entry in re.split(r'<div class="listing_entry', html)[1:]:
            reference = clean(
                next(iter(re.findall(r'listing-content-introduction">(.*?)</div>', entry, re.S)), "")
            )
            title = clean(
                next(iter(re.findall(r'listing-title[^>]*>(.*?)</h2>', entry, re.S)), "")
            )
            if not reference or not title:
                continue
            body = entry[entry.find("</div>", entry.find("listing-content-introduction")) :]
            lines = [clean(l) for l in re.split(r"<br\s*/?>|</p>|</li>", body)]
            lines = [l for l in lines if l and l != reference and len(l) < 120]

            joined = " ".join(lines)
            diameter = re.search(r"Diameter\s*([0-9]+(?:\.[0-9]+)?)\s*mm", joined, re.I)
            water = re.search(r"resistant to\s*([0-9]+)\s*m", joined, re.I)
            # "Stainless steel case, leather strap" — and sometimes
            # "Stainless steel case and bracelet", where the bracelet inherits
            # the material named for the case.
            materials = next((l for l in lines if "case" in l.lower() and "back" not in l.lower()), "")
            parts = [p.strip() for p in re.split(r",|\band\b", materials) if p.strip()]
            case_material = re.sub(
                r"\s*case$", "", next((p for p in parts if "case" in p.lower()), ""), flags=re.I
            )
            strap = next((p for p in parts if re.search(r"strap|bracelet", p, re.I)), "")
            if strap.lower() in ("strap", "bracelet"):
                strap = f"{case_material} {strap}".strip()
            movement = next((l for l in lines if "movement" in l.lower()), "")
            dial = next((l for l in lines if l.lower().endswith("dial")), "")

            photo = next(iter(re.findall(r"data/Ressources/([^&\"']+\.jpg)", entry)), "")
            if not photo:
                continue
            items.append(
                product(
                    reference=reference,
                    name=title,
                    series=title,
                    gender="women" if re.search(r"\blad(y|ies)\b", joined, re.I) else "men",
                    price=0.0,
                    movement=movement,
                    caseMaterial=case_material.strip(),
                    caseSize=f"{diameter.group(1)} mm" if diameter else "",
                    dial=dial,
                    bracelet=strap.strip(),
                    waterResistance=f"{water.group(1)} m" if water else "",
                    images=collect_images(
                        session,
                        [f"{WEST_END_BASE}/data/Ressources/{photo}"],
                        f"west-end-{slugify(reference)}",
                        cap=2,
                    ),
                    sourceUrl=url,
                )
            )
            if limit and len(items) >= limit:
                break
        if limit and len(items) >= limit:
            break
    write_catalog("West End Watch Co.", WEST_END_BASE, items, slug="west-end-watch-co")


# --------------------------------------------------------------------------

FETCHERS: dict[str, Callable[[int | None], None]] = {
    "tissot": fetch_tissot,
    "seiko": fetch_seiko,
    "citizen": fetch_citizen,
    "sainthonore": fetch_sainthonore,
    "jacquesphilippe": fetch_jacquesphilippe,
    "westend": fetch_westend,
}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("brand", choices=[*FETCHERS, "all"])
    parser.add_argument("--limit", type=int, default=None, help="stop after N products")
    args = parser.parse_args()

    IMAGES.mkdir(parents=True, exist_ok=True)
    names = list(FETCHERS) if args.brand == "all" else [args.brand]
    for name in names:
        print(f"{name}:")
        FETCHERS[name](args.limit)


if __name__ == "__main__":
    main()
