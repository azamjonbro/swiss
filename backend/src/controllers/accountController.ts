import { Request, Response } from 'express';
import crypto from 'crypto';
import { Types, HydratedDocument } from 'mongoose';
import { User, IUser } from '../models/User';

type UserDoc = HydratedDocument<IUser>;
import { Inquiry } from '../models/Inquiry';
import { signCustomerToken } from '../utils/jwt';
import { sendVerificationEmail, sendPasswordResetEmail } from '../services/emailService';
import { ApiError } from '../utils/ApiError';
import { CustomerAuthedRequest } from '../middleware/customerAuth';
import { normalizePhone, looksLikeEmail } from '../utils/phone';
import { env } from '../config/env';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.nodeEnv === 'production',
  sameSite: 'lax' as const,
  maxAge: 30 * 24 * 60 * 60 * 1000,
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

function publicUser(user: UserDoc) {
  return {
    id: user.id,
    firstName: user.firstName ?? '',
    lastName: user.lastName ?? '',
    name: user.name ?? '',
    email: user.email,
    phone: user.phone ?? '',
    isEmailVerified: user.isEmailVerified,
    createdAt: user.createdAt,
  };
}

async function issueVerificationEmail(user: UserDoc) {
  const rawToken = user.createEmailVerificationToken();
  await user.save();
  const verifyUrl = `${env.clientUrl}/account/verify-email?token=${rawToken}`;
  await sendVerificationEmail(user.email, user.firstName || user.name, verifyUrl);
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new ApiError(400, `${field} is required`);
  return value.trim();
}

/* ------------------------------------------------------------------ */
/* Registration & verification                                         */
/* ------------------------------------------------------------------ */

export async function register(req: Request, res: Response) {
  const body = req.body as Record<string, unknown>;

  const firstName = requireString(body.firstName, 'First name');
  const lastName = requireString(body.lastName, 'Last name');
  const email = requireString(body.email, 'Email').toLowerCase();
  const rawPhone = requireString(body.phone, 'Phone number');
  const password = requireString(body.password, 'Password');

  if (!EMAIL_RE.test(email)) throw new ApiError(400, 'Enter a valid email address', 'EMAIL_INVALID');

  const phone = normalizePhone(rawPhone);
  if (!phone) throw new ApiError(400, 'Enter a valid phone number', 'PHONE_INVALID');

  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new ApiError(400, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`, 'PASSWORD_SHORT');
  }

  if (await User.exists({ email })) throw new ApiError(409, 'An account with this email already exists', 'EMAIL_TAKEN');
  if (await User.exists({ phone })) {
    throw new ApiError(409, 'An account with this phone number already exists', 'PHONE_TAKEN');
  }

  const user = await User.create({ firstName, lastName, email, phone, password });
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

/* ------------------------------------------------------------------ */
/* Sign in / out                                                       */
/* ------------------------------------------------------------------ */

export async function login(req: Request, res: Response) {
  const body = req.body as Record<string, unknown>;
  // The form offers a single "email or phone" field; older clients send `email`.
  const rawIdentifier = (body.identifier ?? body.email ?? body.phone) as string | undefined;
  const identifier = requireString(rawIdentifier, 'Email or phone');
  const password = requireString(body.password, 'Password');

  let query: Record<string, string>;
  if (looksLikeEmail(identifier)) {
    query = { email: identifier.toLowerCase() };
  } else {
    const phone = normalizePhone(identifier);
    if (!phone) throw new ApiError(401, 'Invalid credentials');
    query = { phone };
  }

  const user = await User.findOne(query).select('+password');
  if (!user || !(await user.comparePassword(password))) throw new ApiError(401, 'Invalid credentials');

  if (!user.isEmailVerified) {
    throw new ApiError(403, 'Please confirm your email address before signing in', 'EMAIL_NOT_VERIFIED');
  }

  user.lastLoginAt = new Date();
  // Validated on purpose: the pre-validate hook backfills firstName/lastName on
  // accounts created before the name was split, so signing in migrates them.
  await user.save();

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

/* ------------------------------------------------------------------ */
/* Password reset                                                      */
/* ------------------------------------------------------------------ */

export async function forgotPassword(req: Request, res: Response) {
  const { email } = req.body as { email?: string };
  if (!email) throw new ApiError(400, 'Email is required');

  const user = await User.findOne({ email: email.toLowerCase() });
  if (user) {
    const rawToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });
    const resetUrl = `${env.clientUrl}/account/reset-password?token=${rawToken}`;
    await sendPasswordResetEmail(user.email, user.firstName || user.name, resetUrl);
  }

  // Unconditional response — the endpoint must not reveal which emails exist.
  res.json({ message: 'If that email has an account, a password reset link has been sent.' });
}

export async function resetPassword(req: Request, res: Response) {
  const { token, password } = req.body as { token?: string; password?: string };
  if (!token) throw new ApiError(400, 'Missing reset token');
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    throw new ApiError(400, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`, 'PASSWORD_SHORT');
  }

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({
    passwordResetTokenHash: tokenHash,
    passwordResetExpires: { $gt: new Date() },
  }).select('+passwordResetTokenHash +passwordResetExpires');

  if (!user) throw new ApiError(400, 'This reset link is invalid or has expired', 'RESET_TOKEN_INVALID');

  user.password = password;
  user.passwordResetTokenHash = undefined;
  user.passwordResetExpires = undefined;
  // Completing a reset proves control of the mailbox, so an unverified account
  // becomes verified rather than being locked out of the sign-in it just earned.
  user.isEmailVerified = true;
  await user.save();

  res.json({ message: 'Password updated. You can now sign in.' });
}

/* ------------------------------------------------------------------ */
/* Profile & settings                                                  */
/* ------------------------------------------------------------------ */

export async function updateProfile(req: CustomerAuthedRequest, res: Response) {
  const user = await User.findById(req.customer?.id);
  if (!user) throw new ApiError(404, 'Account not found');

  const body = req.body as Record<string, unknown>;

  if (body.firstName !== undefined) user.firstName = requireString(body.firstName, 'First name');
  if (body.lastName !== undefined) user.lastName = requireString(body.lastName, 'Last name');

  if (body.phone !== undefined) {
    const phone = normalizePhone(requireString(body.phone, 'Phone number'));
    if (!phone) throw new ApiError(400, 'Enter a valid phone number', 'PHONE_INVALID');
    if (phone !== user.phone && (await User.exists({ phone, _id: { $ne: user._id } }))) {
      throw new ApiError(409, 'An account with this phone number already exists', 'PHONE_TAKEN');
    }
    user.phone = phone;
  }

  await user.save();
  res.json({ user: publicUser(user), message: 'Your details have been updated.' });
}

export async function changePassword(req: CustomerAuthedRequest, res: Response) {
  const { currentPassword, newPassword } = req.body as { currentPassword?: string; newPassword?: string };
  if (!currentPassword || !newPassword) throw new ApiError(400, 'Current and new password are required');
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    throw new ApiError(400, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`, 'PASSWORD_SHORT');
  }

  const user = await User.findById(req.customer?.id).select('+password');
  if (!user) throw new ApiError(404, 'Account not found');
  if (!(await user.comparePassword(currentPassword))) {
    throw new ApiError(401, 'Your current password is incorrect', 'CURRENT_PASSWORD_INVALID');
  }

  user.password = newPassword;
  await user.save();
  res.json({ message: 'Your password has been updated.' });
}

/* ------------------------------------------------------------------ */
/* Saved timepieces                                                    */
/* ------------------------------------------------------------------ */

export async function listSaved(req: CustomerAuthedRequest, res: Response) {
  const user = await User.findById(req.customer?.id).populate({
    path: 'savedWatches',
    match: { isActive: true },
    populate: { path: 'brand', select: 'name slug logo' },
  });
  if (!user) throw new ApiError(404, 'Account not found');
  res.json({ items: user.savedWatches });
}

export async function addSaved(req: CustomerAuthedRequest, res: Response) {
  const { watchId } = req.body as { watchId?: string };
  if (!watchId || !Types.ObjectId.isValid(watchId)) throw new ApiError(400, 'A valid watchId is required');

  // $addToSet keeps this idempotent — saving twice is a no-op, not a duplicate.
  const user = await User.findByIdAndUpdate(
    req.customer?.id,
    { $addToSet: { savedWatches: new Types.ObjectId(watchId) } },
    { new: true },
  ).select('savedWatches');
  if (!user) throw new ApiError(404, 'Account not found');

  res.json({ savedIds: user.savedWatches.map(String) });
}

export async function removeSaved(req: CustomerAuthedRequest, res: Response) {
  const { watchId } = req.params as { watchId?: string };
  if (!watchId || !Types.ObjectId.isValid(watchId)) throw new ApiError(400, 'A valid watchId is required');

  const user = await User.findByIdAndUpdate(
    req.customer?.id,
    { $pull: { savedWatches: new Types.ObjectId(watchId) } },
    { new: true },
  ).select('savedWatches');
  if (!user) throw new ApiError(404, 'Account not found');

  res.json({ savedIds: user.savedWatches.map(String) });
}

export async function listSavedIds(req: CustomerAuthedRequest, res: Response) {
  const user = await User.findById(req.customer?.id).select('savedWatches');
  if (!user) throw new ApiError(404, 'Account not found');
  res.json({ savedIds: user.savedWatches.map(String) });
}

/* ------------------------------------------------------------------ */
/* Orders (acquisition requests)                                       */
/* ------------------------------------------------------------------ */

// The boutique takes acquisitions as concierge inquiries rather than checkout
// orders, so a customer's order history is the inquiries they've raised —
// matched by account link first, falling back to the email on file for requests
// submitted before they signed up.
export async function listOrders(req: CustomerAuthedRequest, res: Response) {
  const user = await User.findById(req.customer?.id);
  if (!user) throw new ApiError(404, 'Account not found');

  const items = await Inquiry.find({
    $or: [{ user: user._id }, { email: user.email }],
  })
    .populate({ path: 'watch', select: 'name slug images price currency brand', populate: { path: 'brand', select: 'name slug' } })
    .sort({ createdAt: -1 })
    .limit(100);

  res.json({ items });
}
