import { Request, Response, NextFunction } from 'express';
import { verifyAdminToken } from '../utils/jwt';
import { Admin } from '../models/Admin';
import { ApiError } from '../utils/ApiError';

export interface AuthedRequest extends Request {
  admin?: { id: string; role: string };
}

export async function requireAuth(req: AuthedRequest, _res: Response, next: NextFunction) {
  try {
    const bearer = req.headers.authorization;
    const token = bearer?.startsWith('Bearer ') ? bearer.slice(7) : req.cookies?.token;

    if (!token) throw new ApiError(401, 'Authentication required');

    const payload = verifyAdminToken(token);
    const admin = await Admin.findById(payload.id);

    if (!admin || !admin.isActive) throw new ApiError(401, 'Invalid or expired session');

    req.admin = { id: admin.id, role: admin.role };
    next();
  } catch {
    next(new ApiError(401, 'Invalid or expired session'));
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthedRequest, _res: Response, next: NextFunction) => {
    if (!req.admin || !roles.includes(req.admin.role)) {
      return next(new ApiError(403, 'Insufficient permissions'));
    }
    next();
  };
}
