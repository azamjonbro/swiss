import { Request, Response } from 'express';
import { Inquiry } from '../models/Inquiry';
import { ApiError } from '../utils/ApiError';
import { CustomerAuthedRequest } from '../middleware/customerAuth';

export async function createInquiry(req: CustomerAuthedRequest, res: Response) {
  const { name, phone, email, watch, message } = req.body as Record<string, string>;
  if (!name || !phone || !email) throw new ApiError(400, 'name, phone, and email are required');

  // Guests may inquire freely; when a customer is signed in the request is
  // stamped with their account so it shows up in their order history.
  const inquiry = await Inquiry.create({
    name,
    phone,
    email,
    user: req.customer?.id,
    watch: watch || undefined,
    message,
  });
  res.status(201).json({ message: 'Your inquiry has been received. Our team will contact you shortly.', inquiry });
}

export async function adminListInquiries(req: Request, res: Response) {
  const { status, page, limit } = req.query;
  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;

  const pageSize = Math.min(Number(limit) || 20, 100);
  const pageNum = Math.max(Number(page) || 1, 1);

  const [items, total] = await Promise.all([
    Inquiry.find(filter)
      .populate('watch', 'name slug brand')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * pageSize)
      .limit(pageSize),
    Inquiry.countDocuments(filter),
  ]);

  res.json({ items, total, page: pageNum, pageSize, pages: Math.ceil(total / pageSize) });
}

export async function adminUpdateInquiry(req: Request, res: Response) {
  const { status } = req.body as { status?: string };
  const inquiry = await Inquiry.findByIdAndUpdate(req.params.id, { status }, { new: true, runValidators: true });
  if (!inquiry) throw new ApiError(404, 'Inquiry not found');
  res.json(inquiry);
}

export async function adminDeleteInquiry(req: Request, res: Response) {
  const inquiry = await Inquiry.findByIdAndDelete(req.params.id);
  if (!inquiry) throw new ApiError(404, 'Inquiry not found');
  res.json({ message: 'Inquiry deleted' });
}
