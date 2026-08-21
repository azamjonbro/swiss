import { Request, Response } from 'express';
import { Watch } from '../models/Watch';
import { ApiError } from '../utils/ApiError';
import { toSlug } from '../utils/slug';
import { Lang, localize, localizeList, resolveLang } from '../utils/i18n';

const WATCH_FIELDS = ['name', 'description', 'shortDescription'];
const BRAND_FIELDS = ['name', 'description'];
const CATEGORY_FIELDS = ['name', 'description', 'tagline'];

function localizeWatch(watch: unknown, lang: Lang): Record<string, unknown> {
  const out = localize(watch, lang, WATCH_FIELDS) as Record<string, unknown>;
  if (out.brand && typeof out.brand === 'object') {
    out.brand = localize(out.brand, lang, BRAND_FIELDS);
  }
  if (out.category && typeof out.category === 'object') {
    out.category = localize(out.category, lang, CATEGORY_FIELDS);
  }
  return out;
}

// ---------- Public ----------

export async function listWatches(req: Request, res: Response) {
  const { category, brand, collection, featured, isNew, q, availability, limit, page } = req.query;

  const filter: Record<string, unknown> = { isActive: true };
  if (category) filter.category = category;
  if (brand) filter.brand = brand;
  if (collection) filter.collectionRef = collection;
  if (featured !== undefined) filter.featured = featured === 'true';
  if (isNew !== undefined) filter.isNewArrival = isNew === 'true';
  if (availability) filter.availability = availability;
  if (q) filter.$text = { $search: String(q) };

  const pageSize = Math.min(Number(limit) || 24, 60);
  const pageNum = Math.max(Number(page) || 1, 1);

  const [items, total] = await Promise.all([
    Watch.find(filter)
      .populate('brand', 'name slug logo translations')
      .populate('category', 'name slug translations')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * pageSize)
      .limit(pageSize),
    Watch.countDocuments(filter),
  ]);

  const lang = resolveLang(req);
  res.json({
    items: items.map((item) => localizeWatch(item as unknown as Record<string, unknown>, lang)),
    total,
    page: pageNum,
    pageSize,
    pages: Math.ceil(total / pageSize),
  });
}

export async function getWatchBySlug(req: Request, res: Response) {
  const watch = await Watch.findOne({ slug: req.params.slug, isActive: true })
    .populate('brand')
    .populate('category')
    .populate('collectionRef');

  if (!watch) throw new ApiError(404, 'Timepiece not found');
  res.json(localizeWatch(watch as unknown as Record<string, unknown>, resolveLang(req)));
}

// ---------- Admin ----------

export async function adminListWatches(req: Request, res: Response) {
  const { q, page, limit } = req.query;
  const filter: Record<string, unknown> = {};
  if (q) filter.$text = { $search: String(q) };

  const pageSize = Math.min(Number(limit) || 20, 100);
  const pageNum = Math.max(Number(page) || 1, 1);

  const [items, total] = await Promise.all([
    Watch.find(filter)
      .populate('brand', 'name')
      .populate('category', 'name')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * pageSize)
      .limit(pageSize),
    Watch.countDocuments(filter),
  ]);

  res.json({ items, total, page: pageNum, pageSize, pages: Math.ceil(total / pageSize) });
}

export async function adminGetWatch(req: Request, res: Response) {
  const watch = await Watch.findById(req.params.id).populate('brand').populate('category').populate('collectionRef');
  if (!watch) throw new ApiError(404, 'Timepiece not found');
  res.json(watch);
}

export async function adminCreateWatch(req: Request, res: Response) {
  const body = req.body;
  if (!body.name || !body.brand || !body.category || body.price === undefined) {
    throw new ApiError(400, 'name, brand, category, and price are required');
  }

  const slug = body.slug ? toSlug(body.slug) : toSlug(`${body.name}-${body.reference ?? ''}`);
  const watch = await Watch.create({ ...body, slug });
  res.status(201).json(watch);
}

export async function adminUpdateWatch(req: Request, res: Response) {
  const body = { ...req.body };
  if (body.slug) body.slug = toSlug(body.slug);

  const watch = await Watch.findByIdAndUpdate(req.params.id, body, { new: true, runValidators: true });
  if (!watch) throw new ApiError(404, 'Timepiece not found');
  res.json(watch);
}

export async function adminDeleteWatch(req: Request, res: Response) {
  const watch = await Watch.findByIdAndDelete(req.params.id);
  if (!watch) throw new ApiError(404, 'Timepiece not found');
  res.json({ message: 'Timepiece deleted' });
}
