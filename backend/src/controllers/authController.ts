import { Request, Response } from 'express';
import { Admin } from '../models/Admin';
import { signAdminToken } from '../utils/jwt';
import { ApiError } from '../utils/ApiError';
import { AuthedRequest } from '../middleware/auth';
import { env } from '../config/env';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.nodeEnv === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

export async function login(req: Request, res: Response) {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) throw new ApiError(400, 'Email and password are required');

  const admin = await Admin.findOne({ email: email.toLowerCase() }).select('+password');
  if (!admin || !admin.isActive) throw new ApiError(401, 'Invalid credentials');

  const valid = await admin.comparePassword(password);
  if (!valid) throw new ApiError(401, 'Invalid credentials');

  const token = signAdminToken({ id: admin.id, role: admin.role });
  res.cookie('token', token, COOKIE_OPTIONS);

  res.json({
    token,
    admin: { id: admin.id, name: admin.name, email: admin.email, role: admin.role },
  });
}

export async function me(req: AuthedRequest, res: Response) {
  const admin = await Admin.findById(req.admin?.id);
  if (!admin) throw new ApiError(404, 'Admin not found');
  res.json({ admin: { id: admin.id, name: admin.name, email: admin.email, role: admin.role } });
}

export async function logout(_req: Request, res: Response) {
  res.clearCookie('token', COOKIE_OPTIONS);
  res.json({ message: 'Logged out' });
}
