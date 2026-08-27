/**
 * Redeploys the storefront when the catalog changes.
 *
 * Product, brand and collection pages are prerendered into static HTML at
 * build time, so a piece added through the admin panel is invisible to a
 * crawler until the next deploy. Every admin write therefore pings a Vercel
 * Deploy Hook.
 *
 * Three properties matter here:
 *
 *   - **Coalescing.** Importing fifty products must cost one deploy, not
 *     fifty. A change fires immediately and then opens a 60-second window;
 *     everything that lands inside it is folded into a single follow-up
 *     deploy fired when the window closes. Leading-edge rather than purely
 *     trailing on purpose: the API also runs as a serverless function, where
 *     a timer is not guaranteed to survive past the response, so the first
 *     change must not depend on one. If the trailing timer is frozen before
 *     it fires, the next write after the window simply deploys again.
 *
 *   - **Never blocking the admin request.** The call is fire-and-forget and
 *     every failure is swallowed after logging. A deploy hook being down must
 *     not turn "save product" into an error.
 *
 *   - **Being diagnosable.** Every trigger, skip and failure is logged with a
 *     timestamp and a reason, so a deploy storm can be read straight out of
 *     the logs.
 */
import { env } from '../config/env';

const WINDOW_MS = 60_000;

let windowEndsAt = 0;
let trailingTimer: NodeJS.Timeout | null = null;
/** Reasons seen since the last fire, for the log line. */
let coalesced: string[] = [];

function log(message: string) {
  console.log(`[deploy-hook] ${new Date().toISOString()} ${message}`);
}

async function fire(reasons: string[]) {
  const summary = reasons.length > 1 ? `${reasons[0]} (+${reasons.length - 1} more)` : reasons[0];
  try {
    const response = await fetch(env.deployHookUrl, { method: 'POST' });
    if (response.ok) log(`triggered — ${summary}`);
    else log(`hook responded ${response.status} ${response.statusText} — ${summary}`);
  } catch (error) {
    // Swallowed on purpose: the admin write has already succeeded, and a
    // missed deploy costs a stale static page until the next change, nothing
    // more.
    log(`failed (${(error as Error).message}) — ${summary}`);
  }
}

/**
 * Asks for a redeploy. Returns immediately; the request is never awaited by
 * the caller and can never fail it.
 *
 * @param reason short description of the change, e.g. `watch:create tb-8214`
 */
export function requestRedeploy(reason: string): void {
  if (!env.deployHookUrl) {
    log(`skipped (VERCEL_DEPLOY_HOOK_URL unset) — ${reason}`);
    return;
  }

  const now = Date.now();

  if (now >= windowEndsAt) {
    windowEndsAt = now + WINDOW_MS;
    coalesced = [];
    void fire([reason]);
    return;
  }

  coalesced.push(reason);
  if (trailingTimer) return;

  log(`coalescing — ${reason} (window closes in ${Math.ceil((windowEndsAt - now) / 1000)}s)`);
  trailingTimer = setTimeout(() => {
    const reasons = coalesced;
    coalesced = [];
    trailingTimer = null;
    windowEndsAt = Date.now() + WINDOW_MS;
    void fire(reasons);
  }, windowEndsAt - now);
  // Never hold the process open for a deploy ping.
  trailingTimer.unref?.();
}

/** Test seam: forgets the current window. */
export function resetRedeployWindow(): void {
  if (trailingTimer) clearTimeout(trailingTimer);
  trailingTimer = null;
  windowEndsAt = 0;
  coalesced = [];
}
