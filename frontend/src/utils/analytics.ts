/**
 * DataFast analytics, wrapped so the storefront never depends on it.
 *
 * Three rules govern everything below, in order:
 *
 *   1. Analytics must not be able to break the site. Every entry point here is
 *      fire-and-forget and swallows its own errors — a blocked request, a
 *      failed dynamic import or a missing website id all resolve to "do
 *      nothing", never to a rejected promise reaching a click handler.
 *   2. Analytics must not be on the critical path. The SDK is dynamically
 *      imported *after* mount, so it never enters the entry chunk and never
 *      delays the paint the preloader is waiting on (see main.ts).
 *   3. Events are sent to our own origin. `apiUrl` points at a Vercel rewrite
 *      (vercel.json) rather than datafa.st, which keeps the request first
 *      party — no third-party connection, and ad blockers leave it alone.
 *      The path is `/datafast-events`, NOT the SDK's default `/api/events`:
 *      `/api/*` is already rewritten to the SwissWatch API, so the default
 *      would send every pageview to a backend that answers 404.
 *
 * Without `VITE_DATAFAST_WEBSITE_ID` the whole module is inert, so a preview
 * deploy or a fresh clone behaves exactly as it did before analytics existed.
 */
import type { CustomProperties, DataFastWeb } from 'datafast';

const WEBSITE_ID = import.meta.env.VITE_DATAFAST_WEBSITE_ID ?? '';

/** Must match the rewrite in vercel.json. */
const EVENTS_PATH = '/datafast-events';

/**
 * The goals this storefront reports, and the only names `trackGoal` accepts.
 *
 * Deliberately short. Every goal counts against the DataFast monthly event
 * quota alongside pageviews, so a goal earns its place only when the answer
 * is not already in the pageview data:
 *
 *   - no `product_view` — the pages breakdown already reports visitors per
 *     `/products/:slug`, so an extra event per product page would double the
 *     quota cost to learn nothing;
 *   - no `telegram_click` / `whatsapp_click` — the storefront publishes
 *     neither channel today, so there is nothing to click.
 *
 * `inquiry_submitted` rather than `order_created`: there is no payment
 * gateway here (see stores/cart.ts), so the conversion is a concierge
 * request, and the metric is named for what actually happened.
 */
export type Goal =
  | 'add_to_cart'
  | 'checkout_start'
  | 'inquiry_submitted'
  | 'phone_click'
  | 'product_saved';

let client: DataFastWeb | null = null;
let booting: Promise<DataFastWeb | null> | null = null;

/**
 * Boots the SDK once and hands back the same client to every later caller.
 *
 * Resolves to `null` — never rejects — when analytics is switched off or the
 * SDK cannot load, so callers can `void` the result without a catch.
 */
function ready(): Promise<DataFastWeb | null> {
  if (client) return Promise.resolve(client);
  if (booting) return booting;
  if (!WEBSITE_ID) return Promise.resolve(null);

  booting = import('datafast')
    .then(({ initDataFast }) =>
      initDataFast({
        websiteId: WEBSITE_ID,
        apiUrl: EVENTS_PATH,
        // The SDK hooks the History API itself, which is what a vue-router
        // SPA needs: without it only the first load of a session would ever
        // be counted and every navigation to a product page would be lost.
        autoCapturePageviews: true,
      }),
    )
    .then((instance) => {
      client = instance;
      return instance;
    })
    .catch(() => {
      // Blocked, offline, or the chunk failed to load. Stay silent and let
      // every later call fall through to the null branch.
      booting = null;
      return null;
    });

  return booting;
}

/**
 * Starts pageview tracking. Safe to call more than once.
 *
 * Called from main.ts after mount. Nothing awaits it.
 */
export function initAnalytics(): void {
  void ready();
}

/**
 * Reports one conversion goal.
 *
 * Never awaited by callers and never throws: a UI action must complete
 * whether or not the event reaches DataFast.
 */
export function trackGoal(goal: Goal, properties?: CustomProperties): void {
  void ready()
    .then((instance) => instance?.track(goal, properties))
    .catch(() => {
      /* analytics is never worth an error in the console of a live storefront */
    });
}
