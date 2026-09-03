import { Request, Response } from 'express';
import { Types, HydratedDocument } from 'mongoose';
import { User, IUser } from '../models/User';

type UserDoc = HydratedDocument<IUser>;
import { Inquiry } from '../models/Inquiry';
import { signCustomerToken } from '../utils/jwt';
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
    createdAt: user.createdAt,
  };
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

  // Signed in immediately. There is no email step to wait for any more, so
  // sending someone to a "check your inbox" screen — or to a sign-in form to
  // retype what they just typed — would be ceremony with nothing behind it.
  user.lastLoginAt = new Date();
  await user.save();

  const token = signCustomerToken({ id: user.id });
  res.cookie('customer_token', token, COOKIE_OPTIONS);
  res.status(201).json({ token, user: publicUser(user) });
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
