import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';
import { isTurnstileEnabled, verifyTurnstile } from '../services/turnstile';

/**
 * Refuses a request whose Turnstile token is missing or not genuine.
 *
 * Put in front of the public forms a script would otherwise be free to hammer:
 * registration, sign-in, changing a password and the concierge inquiry.
 *
 * The token is single-use, so this must run once per request and before the
 * handler does any work. It is deliberately placed *after* the rate limiter on
 * each route — a flood should be turned away by the cheap check, not by an
 * outbound call to Cloudflare for every one of them.
 */
export async function requireCaptcha(req: Request, _res: Response, next: NextFunction) {
  // No secret configured means the whole check is off; see services/turnstile.
  if (!isTurnstileEnabled()) return next();

  const body = (req.body ?? {}) as Record<string, unknown>;
  const fromBody = typeof body.captchaToken === 'string' ? body.captchaToken : '';
  // The header is what Cloudflare's own examples use; accepted so a caller
  // that follows their documentation rather than ours still works.
  const header = req.headers['cf-turnstile-response'];
  const fromHeader = typeof header === 'string' ? header : '';

  const token = fromBody || fromHeader;
  if (!token) {
    throw new ApiError(400, 'Please complete the verification challenge.', 'CAPTCHA_REQUIRED');
  }

  const ok = await verifyTurnstile(token, req.ip);
  if (!ok) {
    // A token is good for one submission. A second attempt needs a new one,
    // which is why the message asks for a retry rather than a correction.
    throw new ApiError(400, 'Verification failed. Please try again.', 'CAPTCHA_FAILED');
  }

  next();
}
