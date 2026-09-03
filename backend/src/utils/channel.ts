/**
 * Which marketing channel a visit arrived through.
 *
 * The storefront reports the raw `document.referrer` and any UTM tags; this
 * turns that into the five buckets the dashboard shows. Keeping the rule here
 * rather than in the query means a visit is classified once, at write time, so
 * the figures cannot drift if the rule is later tuned — old visits keep the
 * classification they were given, and only new ones follow the new rule.
 */

export type Channel = 'direct' | 'organic' | 'social' | 'referral' | 'campaign';

const SEARCH_ENGINES = [
  'google.',
  'bing.',
  'yandex.',
  'duckduckgo.',
  'yahoo.',
  'baidu.',
  'ecosia.',
  'search.brave',
  'mail.ru',
];

const SOCIAL_NETWORKS = [
  'instagram.',
  'facebook.',
  'fb.com',
  'l.facebook',
  'messenger.',
  't.me',
  'telegram.',
  'twitter.',
  'x.com',
  'youtube.',
  'youtu.be',
  'tiktok.',
  'vk.com',
  'linkedin.',
  'lnkd.in',
  'pinterest.',
  'reddit.',
  'threads.',
];

/**
 * `siteHost` is passed in so a visitor moving between pages of the storefront
 * is not counted as a referral from the storefront — the commonest way this
 * kind of report ends up claiming its own domain is its biggest traffic source.
 */
export function resolveChannel(referrer: string, utmSource: string | undefined, siteHost: string): Channel {
  // An explicit campaign tag is a statement of intent and outranks the referrer.
  if (utmSource) return 'campaign';
  if (!referrer) return 'direct';

  let host: string;
  try {
    host = new URL(referrer).hostname.toLowerCase();
  } catch {
    // Not a URL we can read — better to under-claim than to invent a source.
    return 'direct';
  }

  const bare = host.replace(/^www\./, '');
  if (bare === siteHost.replace(/^www\./, '')) return 'direct';

  if (SEARCH_ENGINES.some((engine) => host.includes(engine))) return 'organic';
  if (SOCIAL_NETWORKS.some((network) => host.includes(network))) return 'social';
  return 'referral';
}

/** The label shown in the referrers table: the bare hostname, or "Direct". */
export function referrerLabel(referrer: string): string {
  if (!referrer) return 'Direct';
  try {
    return new URL(referrer).hostname.replace(/^www\./, '');
  } catch {
    return 'Direct';
  }
}
