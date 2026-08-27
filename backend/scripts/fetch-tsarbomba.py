#!/usr/bin/env python3
"""Pull the Tsar Bomba catalogue from tsarbomba.com into this project.

The storefront is Shopify, so `products.json` and `collections/<handle>/products.json`
give us the authoritative product list, colourway breakdown, prices, and photography
without scraping HTML. Two things Shopify does *not* expose are the spec sheet
(movement, case size, water resistance) and any real product copy — the `body_html`
on every listing is shipping boilerplate. So movement and case material are read off
the site's own attribute collections (Automatic Watches, Carbon Fiber Watches, …),
which are facts the brand itself publishes, and the remaining spec fields are left
empty for an editor to fill in from the admin panel rather than invented here.

Writes `src/seed/tsarbomba-import.json` and drops the photography into
`src/uploads/images/` under the same `tsarbomba_<ref>_<n>` convention the existing
catalogue uses. Re-running is safe: an image already on disk is not re-downloaded.

    python3 scripts/fetch-tsarbomba.py
"""

from __future__ import annotations

import io
import json
import re
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

BASE = "https://tsarbomba.com"
ROOT = Path(__file__).resolve().parent.parent
IMAGES = ROOT / "src" / "uploads" / "images"
CACHE = ROOT / ".tsarbomba-cache"
OUT = ROOT / "src" / "seed" / "tsarbomba-import.json"

# Models already curated by hand in seed.ts — their descriptions and spec sheets were
# written for this store, so the importer must not clobber them. Keys are the
# reference as *this* project records it; the site sometimes suffixes the same model
# (TB8215L vs our TB8215), hence the alias map below.
EXISTING = {
    "T2C6101", "TB8204Q", "TB8208A", "TB8208C", "TB8208CF", "TB8208CF-EL", "TB8208D",
    "TB8209C", "TB8210CF", "TB8213", "TB8214", "TB8215", "TB8216", "TB8218", "TB8218D",
    "TB8219", "TB8220L", "TB8222C", "TB8223", "TB8227", "TB8229", "TB8230", "TB8231L",
    "TB8233LG", "TB8601", "TB8602", "TB8603", "TB8604",
}
ALIAS = {"TB8215L": "TB8215", "TB8216TF": "TB8216", "TB8219L": "TB8219", "TB8229C": "TB8229", "T1": "T2C6101"}

# Accessories seed.ts already carries, under the brand's own listing title.
EXISTING_ACCESSORIES = {
    "Atomic Interchangeable Bezel", "Atomic Interchangeable Crown", "Atomic Interchangeable Strap",
    "Reactor Interchangeable Bezel", "Reactor Interchangeable Crown", "Reactor Interchangeable Strap",
    "Dark Matter Interchangeable Automatic Watch Bezel", "Dark Matter Interchangeable Strap",
    "Deployant Clasp",
}

# Listings that exist on the storefront but are not products: display-only pieces and
# bare payment links, all priced at $0.
NOT_A_PRODUCT = re.compile(r"payment link|atomic new|puebla|display only", re.I)

SERIES_COLLECTIONS = [
    ("elemental-collection", "Elemental"),
    ("atomic-collection", "Atomic"),
    ("dark-matter-collection", "Dark Matter"),
    ("light-matter-collection", "Light Matter"),
    ("neutron-collection", "Neutron"),
    ("reactor-collection", "Reactor"),
    ("electron-collection", "Electron"),
    ("skunk-works", "Skunk Works"),
    ("nucleus-femme-collection", "Nucleus Femme"),
]
ATTR_COLLECTIONS = {
    "automatic": ["automatic-watches"],
    "quartz": ["quartz-watch"],
    "chrono": ["chronograph-watches"],
    "skeleton": ["skeleton-watches"],
    "sapphire": ["sapphire-crystal"],
    "interchangeable": ["interchangeable-watch"],
    "carbon": ["carbon-fiber-watches", "tsarbomba-watches-carbon-fiber-watches"],
    "ceramic": ["ceramic-watch", "tsarbomba-ceramic-watches"],
    "titanium": ["titanium-watches"],
    "steel": ["stainless-steel-watch"],
}

# Straps, bezels, crowns and gift boxes are accessories, not models.
NON_WATCH = re.compile(
    r"strap|bezel|crown|clasp|gift box|payment link|kit|accessor|watch head|sapphire|crystal|back cover|atomic new",
    re.I,
)
SERIES_IN_TITLE = [
    ("Nucleus Femme", "Nucleus Femme"), ("Dark Matter", "Dark Matter"), ("Light Matter", "Light Matter"),
    ("Elemental", "Elemental"), ("Atomic", "Atomic"), ("Neutron", "Neutron"), ("Electron", "Electron"),
    ("Reactor", "Reactor"), ("Core Decay", "Reactor"), ("Parallax", "Reactor"), ("Skunk", "Skunk Works"),
]
REF_RE = re.compile(r"\b(TB\d{4}[A-Z]*(?:-II)?)\b", re.I)


def get(path: str) -> dict:
    """Fetch a JSON endpoint, caching the response so re-runs stay offline-friendly."""
    CACHE.mkdir(exist_ok=True)
    cached = CACHE / (re.sub(r"[^a-z0-9]+", "_", path.lower()).strip("_") + ".json")
    if cached.exists():
        return json.loads(cached.read_text())
    req = urllib.request.Request(f"{BASE}/{path}", headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=60) as resp:
        body = resp.read().decode("utf-8")
    cached.write_text(body)
    return json.loads(body)


def handles(collection: str) -> set[str]:
    return {p["handle"] for p in get(f"collections/{collection}/products.json?limit=250")["products"]}


def reference_of(product: dict) -> str | None:
    match = REF_RE.search(product["title"].replace("–", "-"))
    if match:
        return match.group(1).upper()
    for variant in product["variants"]:
        match = re.search(r"(TB\d{4}[A-Z]*)", variant.get("sku") or "", re.I)
        if match:
            return match.group(1).upper()
    return "T1" if "skunk" in product["title"].lower() else None


def colourways(product: dict) -> list[tuple[str, list[str]]]:
    """Split a listing's photography into colourways.

    Shopify tags only the *first* photo of each colourway with its variant id and
    leaves the rest of that colourway's shots untagged, in position order — so carry
    the current colourway forward until the next tagged photo starts a new one.
    """
    labels = {}
    for variant in product["variants"]:
        label = (variant.get("option1") or variant["title"] or "").strip()
        labels[variant["id"]] = "" if label.lower() == "default title" else label

    order: list[str] = []
    buckets: dict[str, list[str]] = {}
    current: str | None = None
    for image in sorted(product["images"], key=lambda i: i["position"]):
        for variant_id in image.get("variant_ids") or []:
            if variant_id in labels:
                current = labels[variant_id]
                break
        if current is None:
            current = next(iter(labels.values()), "")
        if current not in buckets:
            buckets[current] = []
            order.append(current)
        buckets[current].append(image["src"])
    return [(label, buckets[label]) for label in order if buckets[label]]


def save_image(url: str, stem: str) -> str | None:
    """Download one photo as `<stem>.jpg` plus the `.webp` sibling SmartImage prefers."""
    jpg = IMAGES / f"{stem}.jpg"
    webp = IMAGES / f"{stem}.webp"
    if not jpg.exists():
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        raw = None
        # The CDN throttles once a run gets a few hundred photos in, and a throttled
        # download is a transient failure, not a missing photo — back off and retry
        # rather than silently dropping the shot from the colourway.
        for attempt in range(5):
            try:
                with urllib.request.urlopen(req, timeout=90) as resp:
                    raw = resp.read()
                break
            except Exception as exc:  # noqa: BLE001 - one bad photo must not kill the run
                if attempt == 4:
                    print(f"    ! {stem}: {exc}", file=sys.stderr)
                    return None
                time.sleep(2 * (attempt + 1))
        from PIL import Image

        image = Image.open(io.BytesIO(raw))
        # Product shots ship as PNGs on a transparent ground; flatten onto white so the
        # JPEG does not come out with a black backdrop.
        if image.mode in ("RGBA", "LA", "P"):
            image = image.convert("RGBA")
            flat = Image.new("RGB", image.size, (255, 255, 255))
            flat.paste(image, mask=image.split()[-1])
            image = flat
        else:
            image = image.convert("RGB")
        image.save(jpg, "JPEG", quality=88, optimize=True)
    if not webp.exists():
        subprocess.run(["cwebp", "-quiet", "-q", "82", "-m", "6", str(jpg), "-o", str(webp)], check=False)
    return f"/uploads/images/{stem}.jpg"


def download_variants(product: dict, stem: str, label_for_log: str) -> list[dict]:
    """Fetch every colourway's photography for one listing, in catalogue naming order."""
    variants = []
    for index, (label, urls) in enumerate(colourways(product), start=1):
        prefix = f"tsarbomba_{stem}" if index == 1 else f"tsarbomba_{stem}_c{index:02d}"
        print(f"  {label_for_log:22} {label or 'default':24} {len(urls):3} rasm", flush=True)
        images = [p for n, url in enumerate(urls, start=1) if (p := save_image(url, f"{prefix}_{n}"))]
        if images:
            variants.append({"colorLabel": label, "images": images})
    return variants


def main() -> None:
    IMAGES.mkdir(parents=True, exist_ok=True)

    products = get("products.json?limit=250")["products"]
    series = {}
    for handle, label in SERIES_COLLECTIONS:
        for product_handle in handles(handle):
            series[product_handle] = label
    women = handles("women-watches")
    attrs = {key: set().union(*(handles(h) for h in cols)) for key, cols in ATTR_COLLECTIONS.items()}

    # One model can be listed several times (regional warehouses, gift sets). Keep the
    # listing with the richest photography and treat "(Women)" editions as their own model.
    best: dict[str, dict] = {}
    for product in products:
        if NON_WATCH.search(product["title"]):
            continue
        reference = reference_of(product)
        if not reference:
            continue
        is_women = "(Women" in product["title"] or "（Women" in product["title"] or product["handle"] in women
        key = reference + ("-W" if is_women and reference not in ("TB8215L", "TB8219L", "TB8220L", "TB8231L", "TB8233LG") else "")
        if key not in best or len(product["images"]) > len(best[key]["images"]):
            best[key] = product

    entries = []
    for key, product in sorted(best.items()):
        reference = key[:-2] if key.endswith("-W") else key
        if ALIAS.get(reference, reference) in EXISTING and not key.endswith("-W"):
            continue

        handle = product["handle"]
        variants = download_variants(product, key.lower().replace("-", "_"), key)
        if not variants:
            continue

        entries.append({
            "type": "watch",
            "reference": reference,
            "title": re.sub(r"[（(]\s*(Ship from [A-Z.]+|US|EU|DE)\s*[)）]", "", product["title"]).strip(),
            "handle": handle,
            "series": series.get(handle) or next(
                (s for _, s in SERIES_COLLECTIONS if s.lower() in product["title"].lower()), "Elemental"
            ),
            "women": key.endswith("-W") or handle in women,
            "price": min(float(v["price"]) for v in product["variants"] if v["price"]),
            "movement": "automatic" if handle in attrs["automatic"] else ("quartz" if handle in attrs["quartz"] else ""),
            "material": next((m for m in ("carbon", "ceramic", "titanium", "steel") if handle in attrs[m]), ""),
            "chronograph": handle in attrs["chrono"],
            "skeleton": handle in attrs["skeleton"],
            "sapphire": handle in attrs["sapphire"],
            "interchangeable": handle in attrs["interchangeable"],
            "variants": variants,
        })

    # Straps, bezels, crowns, watch heads, crystals, kits and gift boxes. They hang off
    # the same product model as a watch (type "accessory"), so the storefront can filter
    # them in or out, and each one keeps the series its title names it for.
    for product in products:
        title = product["title"]
        if not NON_WATCH.search(title) or NOT_A_PRODUCT.search(title) or title in EXISTING_ACCESSORIES:
            continue
        reference = re.sub(r"[^A-Z0-9]+", "-", title.upper()).strip("-")[:40]
        variants = download_variants(product, re.sub(r"[^a-z0-9]+", "_", title.lower()).strip("_")[:44], title[:22])
        if not variants:
            continue
        entries.append({
            "type": "accessory",
            "reference": reference,
            "title": title,
            "handle": product["handle"],
            "series": next((s for needle, s in SERIES_IN_TITLE if needle.lower() in title.lower()), ""),
            "women": "nucleus femme" in title.lower(),
            "price": min(float(v["price"]) for v in product["variants"] if v["price"]),
            "movement": "",
            "material": "",
            "chronograph": False,
            "skeleton": False,
            "sapphire": "sapphire" in title.lower(),
            "interchangeable": "interchangeable" in title.lower(),
            "variants": variants,
        })

    OUT.write_text(json.dumps(entries, ensure_ascii=False, indent=2))
    photos = sum(len(v["images"]) for e in entries for v in e["variants"])
    watches = sum(1 for e in entries if e["type"] == "watch")
    print(f"\n{watches} model + {len(entries) - watches} aksessuar, {photos} rasm -> {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
