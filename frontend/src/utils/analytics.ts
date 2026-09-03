/**
 * First-party visitor analytics.
 *
 * Sends pageviews and a small set of conversion goals to this project's own
 * API, which is the same origin the storefront already calls — so there is no
 * third-party script, no external connection, and nothing an ad blocker
 * recognises as a tracker. The whole file is a few hundred bytes of behaviour
 * and imports nothing.
 *
 * Three rules shape it:
 *
 *   1. It can never break the site. Every entry point swallows its own errors
 *      and nothing is ever awaited by a UI path.
 *   2. It is never on the critical path. Events are queued and flushed on a
 *      timer or at page hide, not sent one request at a time as they happen.
 *   3. It stores no personal data. The visitor id is a random value this
 *      browser makes up about itself — not a cookie, not derived from
 *      anything about the person — and the server never writes down the IP
 *      address it derives a country from.
 */

const VISITOR_KEY = 'sw-analytics-visitor';
const SESSION_KEY = 'sw-analytics-session';
/** Set `localStorage['sw-analytics-off'] = '1'` to keep your own visits out. */
const OPT_OUT_KEY = 'sw-analytics-off';

/** Matches the server's own idle rule, so both agree where a visit ends. */
const SESSION_IDLE_MS = 30 * 60_000;
/** Long enough to batch a burst of navigation, short enough to survive a tab close. */
const FLUSH_DELAY_MS = 5_000;
const MAX_QUEUE = 10;

/** The goals the server accepts; anything else is discarded there anyway. */
export type Goal =
  | 'add_to_cart'
  | 'remove_from_cart'
  | 'checkout_start'
  | 'inquiry_submitted'
  | 'phone_click'
  | 'email_click'
  | 'instagram_click'
  | 'product_saved'
  | 'search';

interface QueuedEvent {
  type: Goal | 'pageview';
  path: string;
  productSlug?: string;
  ts: number;
}

const ENDPOINT = `${import.meta.env.VITE_API_URL ?? ''}/api/track`;

let enabled = false;
let visitorId = '';
let sessionId = '';
let queue: QueuedEvent[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

/** Captured once per load: where this visit came from, before any navigation. */
let referrer = '';
let entryPath = '';
let utmSource: string | undefined;
let utmMedium: string | undefined;
let utmCampaign: string | undefined;

function readStorage(store: Storage, key: string): string {
  try {
    return store.getItem(key) ?? '';
  } catch {
    // Private mode or storage disabled — analytics simply does not run.
    return '';
  }
}

function writeStorage(store: Storage, key: string, value: string): boolean {
  try {
    store.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function newId(): string {
  try {
    return crypto.randomUUID().replace(/-/g, '');
  } catch {
    return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
  }
}

/**
 * The stable id for this browser, and the id for this particular visit.
 *
 * The session id carries the time it was last touched, so a tab reopened the
 * next morning starts a new visit rather than extending yesterday's — and a
 * plain refresh keeps the same one, which is what stops every reload being
 * counted as a new visitor.
 */
function resolveIdentity(): boolean {
  visitorId = readStorage(localStorage, VISITOR_KEY);
  if (!visitorId) {
    visitorId = newId();
    if (!writeStorage(localStorage, VISITOR_KEY, visitorId)) return false;
  }

  const stored = readStorage(sessionStorage, SESSION_KEY);
  const [storedId, storedAt] = stored.split(':');
  const fresh = storedId && Number(storedAt) > Date.now() - SESSION_IDLE_MS;

  sessionId = fresh ? storedId : newId();
  touchSession();
  return Boolean(sessionId);
}

function touchSession() {
  writeStorage(sessionStorage, SESSION_KEY, `${sessionId}:${Date.now()}`);
}

function captureArrival() {
  entryPath = location.pathname;
  // A referrer from our own host is internal navigation, not a source.
  try {
    referrer = document.referrer && new URL(document.referrer).host !== location.host ? document.referrer : '';
  } catch {
    referrer = '';
  }

  const params = new URLSearchParams(location.search);
  utmSource = params.get('utm_source') ?? undefined;
  utmMedium = params.get('utm_medium') ?? undefined;
  utmCampaign = params.get('utm_campaign') ?? undefined;
}

/**
 * Sends whatever is queued.
 *
 * `sendBeacon` when the page is going away — it is the only transport the
 * browser guarantees to finish after the document is gone, which is exactly
 * the moment the last pageview of a visit would otherwise be lost. `fetch`
 * with `keepalive` otherwise, so a normal flush does not block anything.
 */
function flush(useBeacon = false) {
  if (!enabled || !queue.length) return;

  const payload = JSON.stringify({
    visitorId,
    sessionId,
    referrer,
    entryPath,
    utmSource,
    utmMedium,
    utmCampaign,
    events: queue,
  });
  queue = [];
  if (timer !== null) {
    clearTimeout(timer);
    timer = null;
  }

  try {
    if (useBeacon && navigator.sendBeacon) {
      navigator.sendBeacon(ENDPOINT, new Blob([payload], { type: 'application/json' }));
      return;
    }
    void fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    }).catch(() => {
      /* offline or blocked — the visit simply goes uncounted */
    });
  } catch {
    /* never surface a tracking failure */
  }
}

function enqueue(event: QueuedEvent) {
  if (!enabled) return;
  queue.push(event);
  touchSession();

  if (queue.length >= MAX_QUEUE) return flush();
  if (timer === null) timer = setTimeout(() => flush(), FLUSH_DELAY_MS);
}

/**
 * Turns tracking on for this page load.
 *
 * Called from main.ts after mount. Silently does nothing on localhost, for a
 * visitor who has opted out, or where storage is unavailable — so development
 * never pollutes the figures the boutique reads.
 */
export function initAnalytics(): void {
  if (typeof window === 'undefined') return;
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') return;
  if (readStorage(localStorage, OPT_OUT_KEY) === '1') return;
  if (!resolveIdentity()) return;

  enabled = true;
  captureArrival();

  // `pagehide` rather than `unload`: it is the one that fires reliably on
  // mobile Safari, where a visitor switching apps is the usual way a visit ends.
  window.addEventListener('pagehide', () => flush(true));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) flush(true);
  });
}

/** One page opened. Called from the router once navigation has settled. */
export function trackPageview(path: string): void {
  enqueue({ type: 'pageview', path, ts: Date.now() });
}

/** One conversion goal. Never awaited, never throws. */
export function trackGoal(goal: Goal, productSlug?: string): void {
  enqueue({ type: goal, path: location.pathname, productSlug, ts: Date.now() });
}
