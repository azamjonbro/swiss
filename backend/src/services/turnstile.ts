import { env } from '../config/env';

/**
 * Cloudflare Turnstile verification.
 *
 * The widget in the browser produces a single-use token; only Cloudflare can
 * say whether that token is genuine, so every protected form is checked here
 * against their siteverify endpoint. A token the browser sends is worth
 * nothing until this call confirms it — validating it any other way would be
 * validating a value the caller made up.
 *
 * Turnstile is the right fit for these forms because the common case is
 * invisible: a real customer signing in sees nothing, while a script has to
 * solve a challenge it cannot.
 */

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

interface SiteVerifyResponse {
  success: boolean;
  'error-codes'?: string[];
  hostname?: string;
}

/**
 * Whether captcha checking is switched on.
 *
 * Unset secret means unset: the middleware waves requests through rather than
 * locking every visitor out of sign-up on a deploy made before the keys exist,
 * or on a developer's machine. It is logged once at startup so an unprotected
 * production server cannot be a silent surprise.
 */
export function isTurnstileEnabled(): boolean {
  return Boolean(env.turnstileSecretKey);
}

let warned = false;

export function warnIfDisabled(): void {
  if (isTurnstileEnabled() || warned) return;
  warned = true;
  // eslint-disable-next-line no-console
  console.warn('[turnstile] TURNSTILE_SECRET_KEY is not set — captcha checks are disabled.');
}

/**
 * Asks Cloudflare whether this token is real.
 *
 * A network failure resolves to `false` rather than throwing. The alternative
 * is answering 500 to someone filling in a form correctly, and a captcha that
 * fails open the moment Cloudflare is slow is not a captcha — so the request
 * is refused and the caller is told to try again.
 */
export async function verifyTurnstile(token: string, remoteIp?: string): Promise<boolean> {
  if (!token) return false;

  const form = new URLSearchParams({ secret: env.turnstileSecretKey, response: token });
  // Cloudflare uses the address to spot tokens replayed from somewhere else.
  if (remoteIp) form.set('remoteip', remoteIp);

  try {
    const response = await fetch(VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form,
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      // eslint-disable-next-line no-console
      console.error('[turnstile] siteverify returned', response.status);
      return false;
    }

    const result = (await response.json()) as SiteVerifyResponse;
    if (!result.success) {
      // Logged, never returned: the error codes describe our own configuration
      // as often as the caller's token.
      // eslint-disable-next-line no-console
      console.warn('[turnstile] rejected a token', result['error-codes'] ?? []);
    }
    return result.success === true;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[turnstile] could not reach siteverify', err);
    return false;
  }
}
