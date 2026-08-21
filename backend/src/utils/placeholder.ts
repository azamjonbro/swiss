const DARK_PALETTES: [string, string][] = [
  ['#242220', '#0a0a0a'],
  ['#2c2a28', '#08080a'],
  ['#332f2a', '#131211'],
  ['#3d2529', '#150e10'],
];

const IVORY = '#f3efe7';
const GRAY_200 = '#d8d2c7';
const CHARCOAL = '#2c2a28';

function hashSeed(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return h;
}

interface DialOptions {
  cx: number;
  cy: number;
  rTrack: number;
}

interface DialGeometry {
  cx: number;
  cy: number;
  rotate: number;
  initial: string;
  ticks: string;
  rTrack: number;
  rBezel: number;
  rDial: number;
  hourHandX: number;
  hourHandY: number;
  minHandX: number;
  minHandY: number;
}

function buildDial(seed: string, label: string, strokeColor: string, opts: DialOptions): DialGeometry {
  const h = hashSeed(seed);
  const rotate = ((h >> 2) % 12) * 3 - 18;
  const handAngle = 60 + ((h >> 12) % 40); // classic "ten-past-ten" family of angles
  const initial = (label || seed).trim().charAt(0).toUpperCase() || 'S';

  const { cx, cy, rTrack } = opts;
  const rBezel = rTrack * 1.13;
  const rDial = rTrack * 0.83;

  let ticks = '';
  for (let i = 0; i < 60; i += 1) {
    const isHour = i % 5 === 0;
    const angle = (i / 60) * 360;
    const outer = rTrack;
    const inner = isHour ? rTrack - rTrack * 0.073 : rTrack - rTrack * 0.033;
    const x1 = Math.cos((angle - 90) * (Math.PI / 180));
    const y1 = Math.sin((angle - 90) * (Math.PI / 180));
    ticks += `<line x1="${cx + x1 * outer}" y1="${cy + y1 * outer}" x2="${cx + x1 * inner}" y2="${cy + y1 * inner}" stroke="${strokeColor}" stroke-width="${isHour ? 3 : 1}" opacity="${isHour ? 0.65 : 0.3}"/>`;
  }

  const handRad = (handAngle - 90) * (Math.PI / 180);
  const minRad = (handAngle * 6 - 90) * (Math.PI / 180);

  return {
    cx,
    cy,
    rotate,
    initial,
    ticks,
    rTrack,
    rBezel,
    rDial,
    hourHandX: cx + Math.cos(handRad) * (rDial * 0.55),
    hourHandY: cy + Math.sin(handRad) * (rDial * 0.55),
    minHandX: cx + Math.cos(minRad) * (rDial * 0.78),
    minHandY: cy + Math.sin(minRad) * (rDial * 0.78),
  };
}

function dialMarks(d: DialGeometry, color: string, opacity: { bezel: number; track: number; dial: number; hands: number; pin: number }): string {
  return `<g transform="rotate(${d.rotate} ${d.cx} ${d.cy})">
<circle cx="${d.cx}" cy="${d.cy}" r="${d.rBezel}" fill="none" stroke="${color}" stroke-width="2" opacity="${opacity.bezel}"/>
<circle cx="${d.cx}" cy="${d.cy}" r="${d.rTrack}" fill="none" stroke="${color}" stroke-width="1" opacity="${opacity.track}"/>
${d.ticks}
<circle cx="${d.cx}" cy="${d.cy}" r="${d.rDial}" fill="none" stroke="${color}" stroke-width="1" opacity="${opacity.dial}"/>
<line x1="${d.cx}" y1="${d.cy}" x2="${d.hourHandX}" y2="${d.hourHandY}" stroke="${color}" stroke-width="7" stroke-linecap="round" opacity="${opacity.hands}"/>
<line x1="${d.cx}" y1="${d.cy}" x2="${d.minHandX}" y2="${d.minHandY}" stroke="${color}" stroke-width="4" stroke-linecap="round" opacity="${opacity.hands}"/>
<circle cx="${d.cx}" cy="${d.cy}" r="${Math.max(d.rTrack * 0.03, 5)}" fill="${color}" opacity="${opacity.pin}"/>
</g>`;
}

/**
 * Generates a self-contained, on-brand "watch dial" motif as an SVG data URI —
 * dark and cinematic, portrait-framed, for brand plaques until real
 * photography is uploaded through the admin media library.
 */
export function watchPlaceholder(seed: string, label = ''): string {
  const h = hashSeed(seed);
  const [c1, c2] = DARK_PALETTES[h % DARK_PALETTES.length];
  const cx = 500 + ((h >> 4) % 60) - 30;
  const cy = 640 + ((h >> 8) % 60) - 30;
  const d = buildDial(seed, label, IVORY, { cx, cy, rTrack: 300 });

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1250">
<defs>
<radialGradient id="g" cx="38%" cy="30%" r="85%">
<stop offset="0%" stop-color="${c1}"/>
<stop offset="100%" stop-color="${c2}"/>
</radialGradient>
<radialGradient id="vignette" cx="50%" cy="45%" r="75%">
<stop offset="60%" stop-color="#000000" stop-opacity="0"/>
<stop offset="100%" stop-color="#000000" stop-opacity="0.55"/>
</radialGradient>
<linearGradient id="sheen" x1="0%" y1="0%" x2="100%" y2="100%">
<stop offset="0%" stop-color="#ffffff" stop-opacity="0"/>
<stop offset="46%" stop-color="#ffffff" stop-opacity="0"/>
<stop offset="52%" stop-color="#ffffff" stop-opacity="0.05"/>
<stop offset="58%" stop-color="#ffffff" stop-opacity="0"/>
<stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
</linearGradient>
</defs>
<rect width="1000" height="1250" fill="url(#g)"/>
<text x="500" y="${d.cy + 85}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="360" fill="${IVORY}" opacity="0.08">${d.initial}</text>
${dialMarks(d, IVORY, { bezel: 0.5, track: 0.35, dial: 0.2, hands: 0.55, pin: 0.6 })}
<rect width="1000" height="1250" fill="url(#sheen)"/>
<rect width="1000" height="1250" fill="url(#vignette)"/>
</svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Generates a light, isolated "product on a plain mount" motif — a small,
 * centered, etched watch-face impression on the site's ivory tone, matching
 * the clean studio catalogue presentation (product isolated, generous
 * surrounding whitespace, no scene/props) used for individual timepiece
 * listings until real photography is uploaded.
 */
export function watchProductPlaceholder(seed: string, label = ''): string {
  const d = buildDial(seed, label, CHARCOAL, { cx: 500, cy: 640, rTrack: 300 });

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1250">
<rect width="1000" height="1250" fill="${GRAY_200}"/>
<text x="500" y="${d.cy + 85}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="360" fill="${CHARCOAL}" opacity="0.09">${d.initial}</text>
${dialMarks(d, CHARCOAL, { bezel: 0.4, track: 0.3, dial: 0.18, hands: 0.45, pin: 0.5 })}
</svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Generates a dark, cinematic motif framed for wide full-bleed contexts —
 * category heroes and collection banners. The dial is deliberately small and
 * placed off-center with generous negative space, rather than blown up to
 * fill the frame, so it reads as a restrained mark rather than wallpaper.
 */
export function categoryPlaceholder(seed: string, label = ''): string {
  const h = hashSeed(seed);
  const [c1, c2] = DARK_PALETTES[h % DARK_PALETTES.length];
  const cx = 950 + ((h >> 4) % 120) - 60;
  const cy = 520 + ((h >> 8) % 100) - 50;
  const d = buildDial(seed, label, IVORY, { cx, cy, rTrack: 180 });

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900">
<defs>
<radialGradient id="g" cx="30%" cy="35%" r="90%">
<stop offset="0%" stop-color="${c1}"/>
<stop offset="100%" stop-color="${c2}"/>
</radialGradient>
<radialGradient id="vignette" cx="50%" cy="45%" r="80%">
<stop offset="55%" stop-color="#000000" stop-opacity="0"/>
<stop offset="100%" stop-color="#000000" stop-opacity="0.5"/>
</radialGradient>
</defs>
<rect width="1600" height="900" fill="url(#g)"/>
<text x="${cx}" y="${cy + 52}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="220" fill="${IVORY}" opacity="0.07">${d.initial}</text>
${dialMarks(d, IVORY, { bezel: 0.45, track: 0.32, dial: 0.18, hands: 0.5, pin: 0.55 })}
<rect width="1600" height="900" fill="url(#vignette)"/>
</svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
