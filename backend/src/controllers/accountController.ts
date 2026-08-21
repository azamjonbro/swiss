import { Request, Response } from 'express';
import crypto from 'crypto';
import { User } from '../models/User';
import { signCustomerToken } from '../utils/jwt';
import { sendVerificationEmail } from '../services/emailService';
import { ApiError } from '../utils/ApiError';
import { CustomerAuthedRequest } from '../middleware/customerAuth';
import { env } from '../config/env';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.nodeEnv === 'production',
  sameSite: 'lax' as const,
  maxAge: 30 * 24 * 60 * 60 * 1000,
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function publicUser(user: InstanceType<typeof User>) {
  return { id: user.id, name: user.name, email: user.email, isEmailVerified: user.isEmailVerified };
}

async function issueVerificationEmail(user: InstanceType<typeof User>) {
  const rawToken = user.createEmailVerificationToken();
  await user.save();
  const verifyUrl = `${env.clientUrl}/account/verify-email?token=${rawToken}`;
  await sendVerificationEmail(user.email, user.name, verifyUrl);
}

export async function register(req: Request, res: Response) {
  const { name, email, password } = req.body as { name?: string; email?: string; password?: string };

  if (!name || !email || !password) throw new ApiError(400, 'Name, email, and password are required');
  if (!EMAIL_RE.test(email)) throw new ApiError(400, 'Enter a valid email address');
  if (password.length < 8) throw new ApiError(400, 'Password must be at least 8 characters');

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) throw new ApiError(409, 'An account with this email already exists');

  const user = await User.create({ name, email: email.toLowerCase(), password });
  await issueVerificationEmail(user);

  res.status(201).json({
    message: 'Account created. Check your email to confirm your address before signing in.',
  });
}

export async function verifyEmail(req: Request, res: Response) {
  const { token } = req.query as { token?: string };
  if (!token) throw new ApiError(400, 'Missing verification token');

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({
    emailVerificationTokenHash: tokenHash,
    emailVerificationExpires: { $gt: new Date() },
  }).select('+emailVerificationTokenHash +emailVerificationExpires');

  if (!user) throw new ApiError(400, 'This verification link is invalid or has expired');

  user.isEmailVerified = true;
  user.emailVerificationTokenHash = undefined;
  user.emailVerificationExpires = undefined;
  await user.save();

  res.json({ message: 'Email confirmed. You can now sign in.' });
}

export async function resendVerification(req: Request, res: Response) {
  const { email } = req.body as { email?: string };
  if (!email) throw new ApiError(400, 'Email is required');

  const user = await User.findOne({ email: email.toLowerCase() });
  // Same response whether or not the account exists, so this can't be used to enumerate emails.
  if (user && !user.isEmailVerified) await issueVerificationEmail(user);

  res.json({ message: 'If that email has a pending account, a new confirmation link has been sent.' });
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) throw new ApiError(400, 'Email and password are required');

  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user || !(await user.comparePassword(password))) throw new ApiError(401, 'Invalid credentials');

  if (!user.isEmailVerified) {
    throw new ApiError(403, 'Please confirm your email address before signing in', 'EMAIL_NOT_VERIFIED');
  }

  const token = signCustomerToken({ id: user.id });
  res.cookie('customer_token', token, COOKIE_OPTIONS);
  res.json({ token, user: publicUser(user) });
}

export async function me(req: CustomerAuthedRequest, res: Response) {
  const user = await User.findById(req.customer?.id);
  if (!user) throw new ApiError(404, 'Account not found');
  res.json({ user: publicUser(user) });
}

export async function logout(_req: Request, res: Response) {
  res.clearCookie('customer_token', COOKIE_OPTIONS);
  res.json({ message: 'Logged out' });
}
