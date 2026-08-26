"""Removes the background from product photography for card thumbnails.

No ML model, no heavy dependencies — just a border-seeded flood fill. Source
photography almost always has a fairly uniform (or gently graded) backdrop
that touches all four edges of the frame, with the watch fully inside it, so:

  1. Sample colors along a thin strip around the image perimeter — many
     samples, not just the four corners, so a soft gradient backdrop is
     represented by several reference tones instead of one.
  2. Classify every pixel as "background-like" if it's close in color to any
     of those reference tones.
  3. Keep only the background-like pixels that are 4-connected to the border
     (scipy.ndimage.label) — this is what stops the removal from punching
     holes in a white/silver dial or strap that happens to be a similar tone:
     unless it's actually touching the backdrop, it isn't a background pixel.
  4. Feather the resulting mask edge slightly and crop to its content box.

This is a heuristic, not real segmentation — it can leave a soft halo on a
backdrop with heavy texture, and a background that doesn't touch every edge
(or isn't fairly uniform) won't fully clear. Good enough for studio product
shots and most of the editorial ones; anything it can't clean up just falls
back to the untouched original photo (see SmartImage's `preferTrimmed`).

Writes "<name>_trim.webp" and "<name>_trim.png" (both alpha-capable)
alongside the untouched original.

Run after adding new product photography:
    python3 backend/scripts/remove-product-bg.py
"""

from pathlib import Path
import numpy as np
from scipy import ndimage
from PIL import Image, ImageFilter

IMAGES_DIR = Path(__file__).resolve().parent.parent / 'src' / 'uploads' / 'images'
BORDER_BAND = 3          # px-wide strip sampled around the perimeter for reference colors
COLOR_TOLERANCE = 26     # max per-pixel RGB distance to count as "background-like"
FEATHER_PX = 1.2         # gaussian blur radius on the alpha edge, for anti-aliasing
PAD_FRACTION = 0.05      # breathing room re-added around the detected content box
MIN_REMOVED_FRACTION = 0.03  # if almost nothing was classified as background, skip (nothing to gain)
MAX_REMOVED_FRACTION = 0.90  # if nearly everything reads as "background", the subject itself was
                              # likely translucent/reflective and got misclassified — bail out rather
                              # than crop down to a tiny fragment of the actual watch
MIN_BBOX_COVERAGE = 0.12     # a real kept subject fills a decent share of its own content bbox; a
                              # sapphire/skeleton case on a gradient backdrop can pass the two checks
                              # above while still shattering into scattered specks (each one "kept",
                              # none connected) — that fails here instead of shipping a confetti PNG


def border_reference_colors(arr: np.ndarray) -> np.ndarray:
    h, w, _ = arr.shape
    b = BORDER_BAND
    strip = np.concatenate([
        arr[:b, :, :].reshape(-1, 3),
        arr[-b:, :, :].reshape(-1, 3),
        arr[:, :b, :].reshape(-1, 3),
        arr[:, -b:, :].reshape(-1, 3),
    ])
    # Quantize to dedupe near-identical samples down to a manageable rep set.
    quantized = (strip // 8 * 8).astype(np.uint8)
    return np.unique(quantized, axis=0)


def background_mask(arr: np.ndarray) -> np.ndarray:
    refs = border_reference_colors(arr)
    h, w, _ = arr.shape
    # int32, not int16: a per-channel diff of up to 255 squared is ~65k, and
    # summed across 3 channels that overflows int16 (max 32767) into NaNs.
    flat = arr.reshape(-1, 1, 3).astype(np.int32)
    refs32 = refs.reshape(1, -1, 3).astype(np.int32)
    # Chunk over reference colors to bound memory (pixels x refs x 3).
    min_dist = np.full(flat.shape[0], 999, dtype=np.float64)
    chunk = 64
    for i in range(0, refs32.shape[1], chunk):
        d = np.sqrt(((flat - refs32[:, i:i + chunk, :]) ** 2).sum(axis=2)).min(axis=1)
        min_dist = np.minimum(min_dist, d)
    close = (min_dist <= COLOR_TOLERANCE).reshape(h, w)

    labeled, _ = ndimage.label(close, structure=np.ones((3, 3)))
    border_labels = set(labeled[0, :]) | set(labeled[-1, :]) | set(labeled[:, 0]) | set(labeled[:, -1])
    border_labels.discard(0)
    return np.isin(labeled, list(border_labels))


def process(path: Path) -> str:
    im = Image.open(path).convert('RGB')
    arr = np.asarray(im)
    h, w, _ = arr.shape

    bg = background_mask(arr)
    removed_fraction = bg.mean()
    if removed_fraction < MIN_REMOVED_FRACTION:
        return f'skip-noop removed={removed_fraction:.3f}'
    if removed_fraction > MAX_REMOVED_FRACTION:
        return f'skip-toomuch removed={removed_fraction:.3f}'

    alpha = np.where(bg, 0, 255).astype(np.uint8)
    alpha_img = Image.fromarray(alpha, mode='L').filter(ImageFilter.GaussianBlur(FEATHER_PX))

    rgba = im.convert('RGBA')
    rgba.putalpha(alpha_img)

    kept_mask = alpha_img.point(lambda a: 255 if a > 40 else 0)
    bbox = kept_mask.getbbox()
    if bbox is None:
        return 'skip-empty'
    x0, y0, x1, y1 = bbox
    bbox_coverage = (np.asarray(kept_mask.crop(bbox)) > 0).mean()
    if bbox_coverage < MIN_BBOX_COVERAGE:
        return f'skip-fragmented coverage={bbox_coverage:.3f}'
    pad = int(round(max(x1 - x0, y1 - y0) * PAD_FRACTION))
    padded = (max(0, x0 - pad), max(0, y0 - pad), min(w, x1 + pad), min(h, y1 + pad))
    cropped = rgba.crop(padded)

    stem = path.stem
    cropped.save(path.with_name(f'{stem}_trim.webp'), 'WEBP', quality=90)
    cropped.save(path.with_name(f'{stem}_trim.png'), 'PNG', optimize=True)
    return f'ok removed={removed_fraction:.3f} {w}x{h} -> {cropped.size[0]}x{cropped.size[1]}'


def main():
    files = sorted(IMAGES_DIR.glob('*.jpg')) + sorted(IMAGES_DIR.glob('*.jpeg')) + sorted(IMAGES_DIR.glob('*.png'))
    files = [f for f in files if '_trim' not in f.stem]
    counts: dict[str, int] = {}
    for i, f in enumerate(files):
        try:
            result = process(f)
        except Exception as e:  # noqa: BLE001 — batch job, one bad file shouldn't stop the run
            result = f'ERROR: {e}'
        label = result.split()[0]
        counts[label] = counts.get(label, 0) + 1
        print(f'[{i + 1}/{len(files)}]', f.name, '->', result, flush=True)
    print('---')
    print(counts)


if __name__ == '__main__':
    main()
