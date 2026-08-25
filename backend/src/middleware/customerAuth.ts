import { Request, Response, NextFunction } from 'express';
import { verifyCustomerToken } from '../utils/jwt';
import { User } from '../models/User';
import { ApiError } from '../utils/ApiError';

export interface CustomerAuthedRequest extends Request {
  customer?: { id: string };
}

// Storefront sessions live on their own cookie name and their own Authorization
// header value; nothing here ever consults the admin cookie.
function readCustomerToken(req: Request): string | undefined {
  const bearer = req.headers.authorization;
  if (bearer?.startsWith('Bearer ')) return bearer.slice(7);
  return req.cookies?.customer_token;
}

export async function requireCustomerAuth(req: CustomerAuthedRequest, _res: Response, next: NextFunction) {
  try {
    const token = readCustomerToken(req);
    if (!token) throw new ApiError(401, 'Authentication required');

    const payload = verifyCustomerToken(token);
    const user = await User.findById(payload.id);

    if (!user) throw new ApiError(401, 'Invalid or expired session');

    req.customer = { id: user.id };
    next();
  } catch {
    next(new ApiError(401, 'Invalid or expired session'));
  }
}

// Non-blocking variant: used by public endpoints (inquiries) that should record
// who submitted them when a customer happens to be signed in, but must keep
// working for guests.
export async function attachCustomerIfPresent(req: CustomerAuthedRequest, _res: Response, next: NextFunction) {
  const token = readCustomerToken(req);
  if (!token) return next();

  try {
    const payload = verifyCustomerToken(token);
    const user = await User.findById(payload.id).select('_id');
    if (user) req.customer = { id: user.id };
  } catch {
    // An unusable token simply means "treat this as a guest".
  }
  next();
}
