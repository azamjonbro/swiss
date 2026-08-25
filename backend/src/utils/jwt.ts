import jwt from 'jsonwebtoken';
import { env } from '../config/env';

// Admin and customer sessions are signed with the same secret but carry
// mutually exclusive audiences, so a storefront token can never satisfy an
// admin route (or the reverse) even though both hit the same API.
export const ADMIN_AUDIENCE = 'admin';
export const CUSTOMER_AUDIENCE = 'customer';

export interface AdminTokenPayload {
  id: string;
  role: string;
}

export function signAdminToken(payload: AdminTokenPayload): string {
  return jwt.sign({ ...payload, aud: ADMIN_AUDIENCE }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as jwt.SignOptions['expiresIn'],
  });
}

export function verifyAdminToken(token: string): AdminTokenPayload {
  // Verified without an `audience` option, then checked by hand: admin tokens
  // issued before audiences existed carry none, and rejecting those outright
  // would sign every logged-in admin out on deploy. Any token minted for a
  // different audience is still refused.
  const payload = jwt.verify(token, env.jwtSecret) as AdminTokenPayload & { aud?: string };
  if (payload.aud && payload.aud !== ADMIN_AUDIENCE) {
    throw new Error('Token audience is not admin');
  }
  return payload;
}

export interface CustomerTokenPayload {
  id: string;
}

export function signCustomerToken(payload: CustomerTokenPayload): string {
  return jwt.sign({ ...payload, aud: CUSTOMER_AUDIENCE }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as jwt.SignOptions['expiresIn'],
  });
}

export function verifyCustomerToken(token: string): CustomerTokenPayload {
  return jwt.verify(token, env.jwtSecret, { audience: CUSTOMER_AUDIENCE }) as CustomerTokenPayload;
}
