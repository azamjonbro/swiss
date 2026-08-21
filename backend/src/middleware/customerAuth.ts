import { Request, Response, NextFunction } from 'express';
import { verifyCustomerToken } from '../utils/jwt';
import { User } from '../models/User';
import { ApiError } from '../utils/ApiError';

export interface CustomerAuthedRequest extends Request {
  customer?: { id: string };
}

export async function requireCustomerAuth(req: CustomerAuthedRequest, _res: Response, next: NextFunction) {
  try {
    const bearer = req.headers.authorization;
    const token = bearer?.startsWith('Bearer ') ? bearer.slice(7) : req.cookies?.customer_token;

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
