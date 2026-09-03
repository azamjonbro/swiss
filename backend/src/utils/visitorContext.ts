import { Request } from 'express';

/**
 * Everything the server can tell about a visit from the request itself.
 *
 * Deliberately hand-written rather than a User-Agent parsing library. The
 * question here is narrow — three device classes and the handful of browsers
 * and systems that actually appear in a Tashkent boutique's traffic — and the
 * popular parser carries a licence that changed under its users and a
 * regex table that needs patching to stay current. Eighty lines that this
 * project owns are easier to keep honest than a dependency that must be
 * watched. Anything unrecognised is reported as 'Unknown', never guessed.
 */

export type Device = 'desktop' | 'mobile' | 'tablet';

export interface VisitorContext {
  device: Device;
  browser: string;
  os: string;
  country?: string;
  city?: string;
  isBot: boolean;
}

/**
 * Automated traffic, which must never be counted as a visitor.
 *
 * The tracker is JavaScript, so most crawlers never fire it at all — but
 * Googlebot renders pages, and headless Chrome in a monitoring script looks
 * exactly like a person unless it is named. Left unfiltered these are not a
 * rounding error: on a quiet site they can outnumber the humans.
 */
const BOT_PATTERN =
  /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|whatsapp|telegrambot|headless|lighthouse|gtmetrix|pingdom|uptime|curl\/|wget|python-requests|axios\/|node-fetch|okhttp|scrapy|semrush|ahrefs|mj12|dotbot|petalbot|yandexbot|applebot/i;

/** Order matters: Edge and Opera both claim to be Chrome, Chrome claims Safari. */
const BROWSERS: [RegExp, string][] = [
  [/Edg[eA]?\//, 'Edge'],
  [/OPR\/|Opera/, 'Opera'],
  [/SamsungBrowser\//, 'Samsung Internet'],
  [/YaBrowser\//, 'Yandex Browser'],
  [/Firefox\/|FxiOS\//, 'Firefox'],
  [/Chrome\/|CriOS\//, 'Chrome'],
  [/Safari\//, 'Safari'],
];

const SYSTEMS: [RegExp, string][] = [
  [/Windows NT/, 'Windows'],
  [/iPhone|iPad|iPod/, 'iOS'],
  [/Mac OS X/, 'macOS'],
  [/Android/, 'Android'],
  [/CrOS/, 'ChromeOS'],
  [/Linux/, 'Linux'],
];

function match(table: [RegExp, string][], ua: string): string {
  for (const [pattern, label] of table) {
    if (pattern.test(ua)) return label;
  }
  return 'Unknown';
}

/**
 * Tablet before mobile: an iPad's UA contains neither "Mobile" nor "Android",
 * and an Android tablet is precisely an Android that is *not* "Mobile".
 */
function deviceOf(ua: string): Device {
  if (/iPad|Tablet|PlayBook|Silk/.test(ua) || (/Android/.test(ua) && !/Mobile/.test(ua))) return 'tablet';
  if (/Mobi|iPhone|iPod|Android|Windows Phone/.test(ua)) return 'mobile';
  return 'desktop';
}

/**
 * Country and city, when the edge in front of us has already worked them out.
 *
 * The storefront is served by Vercel and proxied to this API, and both Vercel
 * and Cloudflare attach the visitor's location as request headers. Reading
 * them costs nothing and needs no IP database in a process that runs under a
 * 300 MB ceiling.
 *
 * When the headers are absent the fields stay undefined and the dashboard
 * shows the visit as "Unknown" — which is the truthful answer. Guessing from
 * language or timezone would fill the map with confident nonsense.
 */
function geoOf(req: Request): { country?: string; city?: string } {
  const header = (name: string): string | undefined => {
    const value = req.headers[name];
    const raw = Array.isArray(value) ? value[0] : value;
    const trimmed = raw?.trim();
    return trimmed ? decodeURIComponent(trimmed) : undefined;
  };

  const country = header('x-vercel-ip-country') ?? header('cf-ipcountry') ?? header('x-country-code');
  const city = header('x-vercel-ip-city') ?? header('cf-ipcity');

  // Cloudflare sends "XX" for addresses it cannot place.
  return { country: country && country !== 'XX' ? country : undefined, city };
}

export function readVisitorContext(req: Request): VisitorContext {
  const ua = String(req.headers['user-agent'] ?? '');

  return {
    device: deviceOf(ua),
    browser: match(BROWSERS, ua),
    os: match(SYSTEMS, ua),
    ...geoOf(req),
    // An empty User-Agent is not a browser anyone browses with.
    isBot: !ua || BOT_PATTERN.test(ua),
  };
}
