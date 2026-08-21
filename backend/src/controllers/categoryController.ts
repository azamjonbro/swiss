import { Request, Response } from 'express';
import { Category } from '../models/Category';
import { ApiError } from '../utils/ApiError';
import { toSlug } from '../utils/slug';
import { localize, localizeList, resolveLang } from '../utils/i18n';

const CATEGORY_FIELDS = ['name', 'description', 'tagline'];

export async function listCategories(req: Request, res: Response) {
  const items = await Category.find({ isActive: true }).sort({ order: 1 });
  res.json({ items: localizeList(items, resolveLang(req), CATEGORY_FIELDS) });
}

export async function getCategoryBySlug(req: Request, res: Response) {
  const category = await Category.findOne({ slug: req.params.slug, isActive: true });
  if (!category) throw new ApiError(404, 'Category not found');
  res.json(localize(category, resolveLang(req), CATEGORY_FIELDS));
}

export async function adminListCategories(_req: Request, res: Response) {
  const items = await Category.find().sort({ order: 1 });
  res.json({ items });
}

export async function adminCreateCategory(req: Request, res: Response) {
  const body = req.body;
  if (!body.name) throw new ApiError(400, 'name is required');

  const slug = body.slug ? toSlug(body.slug) : toSlug(body.name);
  const order = body.order ?? (await Category.countDocuments());
  const category = await Category.create({ ...body, slug, order });
  res.status(201).json(category);
}

export async function adminUpdateCategory(req: Request, res: Response) {
  const body = { ...req.body };
  if (body.slug) body.slug = toSlug(body.slug);

  const category = await Category.findByIdAndUpdate(req.params.id, body, { new: true, runValidators: true });
  if (!category) throw new ApiError(404, 'Category not found');
  res.json(category);
}

export async function adminDeleteCategory(req: Request, res: Response) {
  const category = await Category.findByIdAndDelete(req.params.id);
  if (!category) throw new ApiError(404, 'Category not found');
  res.json({ message: 'Category deleted' });
}

export async function adminReorderCategories(req: Request, res: Response) {
  const { order } = req.body as { order: string[] };
  if (!Array.isArray(order)) throw new ApiError(400, 'order must be an array of category ids');

  await Promise.all(order.map((id, index) => Category.findByIdAndUpdate(id, { order: index })));
  const items = await Category.find().sort({ order: 1 });
  res.json({ items });
}
