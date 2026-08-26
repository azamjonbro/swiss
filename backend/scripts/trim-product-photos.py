"""Normalizes the visual scale of product photography for card thumbnails.

Source photos carry wildly inconsistent amounts of white margin baked into
the file (some ~60% empty space, others ~95% watch), which makes catalog
cards look randomly different in scale even inside identical square
containers. This trims each white-background photo to its actual content
box (plus a little breathing room) and writes "<name>_trim.jpg/.webp"
derivatives alongside the original — the original is never modified, and
SmartImage's `preferTrimmed` prop falls back to it automatically when no
derivative exists.

Run after adding new product photography:
    python3 backend/scripts/trim-product-photos.py
"""

from pathlib import Path
import numpy as np
from PIL import Image

IMAGES_DIR = Path(__file__).resolve().parent.parent / 'src' / 'uploads' / 'images'
THRESHOLD = 248                # per-channel value counted as "near-white background"
SKIP_IF_COVERAGE_OVER = 0.92   # already tight, or not a white-bg photo (e.g. an editorial shot) — leave alone
SKIP_IF_COVERAGE_UNDER = 0.03  # basically blank — leave alone rather than crop to near-nothing
PAD_FRACTION = 0.05            # breathing room re-added around the detected content box


def content_bbox(im: Image.Image):
    arr = np.asarray(im.convert('RGB'))
    non_bg = np.any(arr < THRESHOLD, axis=2)
    rows = np.where(non_bg.any(axis=1))[0]
    cols = np.where(non_bg.any(axis=0))[0]
    if rows.size == 0 or cols.size == 0:
        return None
    return int(cols[0]), int(rows[0]), int(cols[-1]) + 1, int(rows[-1]) + 1


def pad_bbox(bbox, w, h, frac):
    x0, y0, x1, y1 = bbox
    pad = int(round(max(x1 - x0, y1 - y0) * frac))
    return (max(0, x0 - pad), max(0, y0 - pad), min(w, x1 + pad), min(h, y1 + pad))


def process(path: Path) -> str:
    im = Image.open(path)
    w, h = im.size
    bbox = content_bbox(im)
    if bbox is None:
        return 'skip-blank'
    coverage = ((bbox[2] - bbox[0]) * (bbox[3] - bbox[1])) / (w * h)
    if coverage > SKIP_IF_COVERAGE_OVER or coverage < SKIP_IF_COVERAGE_UNDER:
        return f'skip coverage={coverage:.3f}'

    padded = pad_bbox(bbox, w, h, PAD_FRACTION)
    cropped = im.convert('RGB').crop(padded)

    stem = path.stem
    cropped.save(path.with_name(f'{stem}_trim.jpg'), 'JPEG', quality=90)
    cropped.save(path.with_name(f'{stem}_trim.webp'), 'WEBP', quality=82)
    return f'trimmed coverage={coverage:.3f} {w}x{h} -> {cropped.size[0]}x{cropped.size[1]}'


def main():
    files = sorted(IMAGES_DIR.glob('*.jpg')) + sorted(IMAGES_DIR.glob('*.jpeg')) + sorted(IMAGES_DIR.glob('*.png'))
    files = [f for f in files if '_trim' not in f.stem]
    counts: dict[str, int] = {}
    for f in files:
        try:
            result = process(f)
        except Exception as e:  # noqa: BLE001 — batch job, one bad file shouldn't stop the run
            result = f'ERROR: {e}'
        label = result.split()[0]
        counts[label] = counts.get(label, 0) + 1
        print(f.name, '->', result)
    print('---')
    print(counts)


if __name__ == '__main__':
    main()
