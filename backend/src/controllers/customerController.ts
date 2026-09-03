import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { User } from '../models/User';
import { Inquiry } from '../models/Inquiry';
import { ApiError } from '../utils/ApiError';

/**
 * Registered storefront customers, as the admin panel sees them.
 *
 * Read-only on purpose. The panel exists to answer "who signed up and are they
 * coming back" — editing someone else's account, or deleting it, is a
 * different decision with different consequences and is not offered here.
 *
 * Every query names the fields it returns instead of relying on the schema to
 * hide the rest. The password and the verification/reset token hashes are
 * already `select: false` in the model, but a whitelist means a field added to
 * the model later cannot leak into this response by default.
 */

/** Exactly what an admin may see about a customer. */
const LIST_FIELDS = 'firstName lastName name email phone isEmailVerified savedWatches lastLoginAt createdAt';

/** A search box is not a place to accept a regular expression. */
function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function adminListCustomers(req: Request, res: Response) {
  const { search, verified, page, limit } = req.query;

  const filter: Record<string, unknown> = {};

  if (typeof search === 'string' && search.trim()) {
    const pattern = new RegExp(escapeRegex(search.trim()), 'i');
    filter.$or = [{ name: pattern }, { email: pattern }, { phone: pattern }];
  }

  // Absent means "all"; only an explicit true/false narrows the list.
  if (verified === 'true') filter.isEmailVerified = true;
  if (verified === 'false') filter.isEmailVerified = false;

  const pageSize = Math.min(Number(limit) || 20, 100);
  const pageNum = Math.max(Number(page) || 1, 1);

  const [users, total] = await Promise.all([
    User.find(filter)
      .select(LIST_FIELDS)
      // Newest registrations first: the question this page is usually opened
      // to answer is "who signed up recently".
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * pageSize)
      .limit(pageSize)
      .lean(),
    User.countDocuments(filter),
  ]);

  // How many requests each customer on *this page* has raised. One grouped
  // query for the page rather than one per row, and scoped to the page's ids
  // so it stays the same size however large the customer list grows.
  const ids = users.map((user) => user._id);
  const inquiryCounts = await Inquiry.aggregate<{ _id: Types.ObjectId; count: number }>([
    { $match: { user: { $in: ids } } },
    { $group: { _id: '$user', count: { $sum: 1 } } },
  ]);
  const inquiriesByUser = new Map(inquiryCounts.map((row) => [String(row._id), row.count]));

  res.json({
    items: users.map((user) => ({
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      name: user.name,
      email: user.email,
      phone: user.phone ?? '',
      isEmailVerified: user.isEmailVerified,
      // The list needs the size of the wishlist, never its contents.
      savedCount: user.savedWatches?.length ?? 0,
      inquiryCount: inquiriesByUser.get(String(user._id)) ?? 0,
      lastLoginAt: user.lastLoginAt ?? null,
      createdAt: user.createdAt,
    })),
    total,
    page: pageNum,
    pageSize,
    pages: Math.ceil(total / pageSize),
  });
}

/**
 * One customer, with the two things that say what they actually did: the
 * pieces they saved and the requests they raised.
 */
export async function adminGetCustomer(req: Request, res: Response) {
  // Express 5 types a route param as `string | string[]`; only a single value
  // can ever reach this route, but the id must be narrowed before it is used.
  const id = String(req.params.id ?? '');
  if (!Types.ObjectId.isValid(id)) throw new ApiError(400, 'Invalid customer id');

  const user = await User.findById(id)
    .select(LIST_FIELDS)
    .populate({ path: 'savedWatches', select: 'name slug reference price currency' })
    .lean();

  if (!user) throw new ApiError(404, 'Customer not found');

  const inquiries = await Inquiry.find({ user: id })
    .populate('watch', 'name slug')
    .select('name phone email message status watch createdAt')
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  res.json({
    customer: {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      name: user.name,
      email: user.email,
      phone: user.phone ?? '',
      isEmailVerified: user.isEmailVerified,
      lastLoginAt: user.lastLoginAt ?? null,
      createdAt: user.createdAt,
    },
    savedWatches: user.savedWatches ?? [],
    inquiries,
  });
}
