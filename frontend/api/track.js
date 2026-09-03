/**
 * Analytics beacon, forwarded with the visitor's real location attached.
 *
 * The storefront could post straight to the API through the `/api/:path*`
 * rewrite, and for a while it did — but a Vercel rewrite to an external origin
 * makes the request *from Vercel*, not from the visitor. The API sits behind
 * Cloudflare, so Cloudflare reported the Vercel edge as the client and every
 * visit was recorded from Hong Kong. Measured, not assumed: the same beacon
 * posted directly to the API host recorded UZ, while through the rewrite it
 * recorded HK.
 *
 * A function fixes it without giving up the same-origin request. Vercel gives
 * *this* code the visitor's country and city in headers, and it passes them —
 * along with the original User-Agent, without which the API would classify
 * every visit as an unknown device — on to the API explicitly.
 *
 * Sending the beacon cross-origin to the API host would also have worked, but
 * it would put a second hostname in front of every visitor, need CORS, and
 * hand ad blockers a request to a domain that is not the site they are on.
 */

/** Same fallback the SPA function uses, so both agree on where the API lives. */
const API = (process.env.SEO_API_URL || 'https://swiss.sds-max.uz').replace(/\/+$/, '');

/** A beacon is a page's worth of activity; anything larger is not one. */
const MAX_BODY_BYTES = 16 * 1024;

function readBody(req) {
  // Vercel parses JSON bodies for us, but `sendBeacon` sends a Blob and the
  // parsed value can arrive as a string or a Buffer depending on the type the
  // browser set. Normalise all three to the string the API expects.
  const body = req.body;
  if (body === undefined || body === null) return '';
  if (typeof body === 'string') return body;
  if (Buffer.isBuffer(body)) return body.toString('utf8');
  try {
    return JSON.stringify(body);
  } catch {
    return '';
  }
}

export default async function handler(req, res) {
  // Nothing here is worth a status code the storefront would react to: the
  // tracker never reads the response, and a visitor must never be affected by
  // whether analytics was recorded.
  const done = () => res.status(204).end();

  if (req.method !== 'POST') return done();

  const payload = readBody(req);
  if (!payload || Buffer.byteLength(payload, 'utf8') > MAX_BODY_BYTES) return done();

  const header = (name) => {
    const value = req.headers[name];
    return Array.isArray(value) ? value[0] : value;
  };

  const forwarded = {
    'Content-Type': 'application/json',
    // The API reads these first, ahead of any header Cloudflare adds — which
    // is the whole point of this function.
    ...(header('x-vercel-ip-country') ? { 'x-vercel-ip-country': header('x-vercel-ip-country') } : {}),
    ...(header('x-vercel-ip-city') ? { 'x-vercel-ip-city': header('x-vercel-ip-city') } : {}),
    // Device, browser and OS are all read from this. Without it every visit
    // would be recorded as an unknown system — and an empty User-Agent is one
    // of the signals the API uses to discard bots, so the visit would vanish.
    ...(header('user-agent') ? { 'User-Agent': header('user-agent') } : {}),
  };

  try {
    await fetch(`${API}/api/track`, {
      method: 'POST',
      headers: forwarded,
      body: payload,
      // The visitor is not waiting on this, but the function should not be
      // held open by an API that has stopped answering either.
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    // Unreachable API, timeout, malformed upstream response — the visit goes
    // uncounted and nothing else changes.
  }

  return done();
}
