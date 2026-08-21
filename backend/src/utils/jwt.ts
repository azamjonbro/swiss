import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface AdminTokenPayload {
  id: string;
  role: string;
}

export function signAdminToken(payload: AdminTokenPayload): string {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn as jwt.SignOptions['expiresIn'] });
}

export function verifyAdminToken(token: string): AdminTokenPayload {
  return jwt.verify(token, env.jwtSecret) as AdminTokenPayload;
}

export interface CustomerTokenPayload {
  id: string;
}

export function signCustomerToken(payload: CustomerTokenPayload): string {
  return jwt.sign({ ...payload, aud: 'customer' }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as jwt.SignOptions['expiresIn'],
  });
}

export function verifyCustomerToken(token: string): CustomerTokenPayload {
  return jwt.verify(token, env.jwtSecret, { audience: 'customer' }) as CustomerTokenPayload;
}
