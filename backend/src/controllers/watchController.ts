import { Request, Response } from 'express';
import { Watch } from '../models/Watch';
import { ApiError } from '../utils/ApiError';
import { toSlug } from '../utils/slug';
import { Lang, localize, resolveLang } from '../utils/i18n';
import { buildSearchFilter } from '../utils/search';
import { requestRedeploy } from '../services/deployHook';

const WATCH_FIELDS = ['name', 'description', 'shortDescription'];
const BRAND_FIELDS = ['name', 'description'];
const CATEGORY_FIELDS = ['name', 'description', 'tagline'];

function localizeVariants(variants: unknown, lang: Lang) {
  if (!Array.isArray(variants)) return variants;
  return variants.map((v) => {
    const variant = v as Record<string, unknown>;
    const label =
      lang === 'ru' ? (variant.colorLabelRu as string) : lang === 'uz' ? (variant.colorLabelUz as string) : undefined;
    return {
      colorSlug: variant.colorSlug,
      colorLabel: label || (variant.colorLabel as string) || '',
      images: variant.images,
      videos: variant.videos,
    };
  });
}

function localizeWatch(watch: unknown, lang: Lang): Record<string, unknown> {
  const out = localize(watch, lang, WATCH_FIELDS) as Record<string, unknown>;
  out.variants = localizeVariants(out.variants, lang);
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
  const { category, brand, collection, featured, isNew, q, availability, color, type, gender, limit, page } = req.query;

  const filter: Record<string, unknown> = { isActive: true };
  // Accessories are surfaced only via "pair it with" on a product page, never
  // in the main catalog grid, unless a caller explicitly asks for them —
  // `type=accessory` for the parts alone, `type=all` for one combined listing.
  if (type === 'accessory' || type === 'watch') filter.type = type;
  else if (type !== 'all') filter.type = { $ne: 'accessory' };
  if (gender === 'men' || gender === 'women') filter.gender = gender;
  if (category) filter.category = category;
  if (brand) filter.brand = brand;
  if (collection) filter.collectionRef = collection;
  if (featured !== undefined) filter.featured = featured === 'true';
  if (isNew !== undefined) filter.isNewArrival = isNew === 'true';
  if (availability) filter.availability = availability;
  if (color) filter['variants.colorSlug'] = String(color);
  if (q) {
    const search = await buildSearchFilter(String(q));
    // A term that tokenises to nothing must not silently return the whole
    // catalogue as if no search had been asked for.
    if (search) Object.assign(filter, search);
  }

  // The full Tsar Bomba catalogue is a little over 90 products with its accessories,
  // and the storefront filters client-side over one fetch, so the cap has to clear it.
  const pageSize = Math.min(Number(limit) || 24, 150);
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

  const lang = resolveLang(req);
  const [accessories, related] = await Promise.all([
    watch.type === 'accessory'
      ? Promise.resolve([])
      : Watch.find({ type: 'accessory', compatibleWith: watch._id, isActive: true })
          .populate('brand', 'name slug')
          .populate('category', 'name slug'),
    watch.relatedWatches?.length
      ? Watch.find({ _id: { $in: watch.relatedWatches }, isActive: true })
          .populate('brand', 'name slug')
          .populate('category', 'name slug')
      : Promise.resolve([]),
  ]);

  res.json({
    ...localizeWatch(watch as unknown as Record<string, unknown>, lang),
    accessories: accessories.map((a) => localizeWatch(a as unknown as Record<string, unknown>, lang)),
    related: related.map((r) => localizeWatch(r as unknown as Record<string, unknown>, lang)),
  });
}

// ---------- Admin ----------

export async function adminListWatches(req: Request, res: Response) {
  const { q, page, limit } = req.query;
  const filter: Record<string, unknown> = {};
  if (q) {
    const search = await buildSearchFilter(String(q));
    if (search) Object.assign(filter, search);
  }

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
  // The product has no prerendered page until the storefront rebuilds.
  requestRedeploy(`watch:create ${watch.slug}`);
  res.status(201).json(watch);
}

export async function adminUpdateWatch(req: Request, res: Response) {
  const body = { ...req.body };
  if (body.slug) body.slug = toSlug(body.slug);

  const watch = await Watch.findByIdAndUpdate(req.params.id, body, { new: true, runValidators: true });
  if (!watch) throw new ApiError(404, 'Timepiece not found');
  requestRedeploy(`watch:update ${watch.slug}`);
  res.json(watch);
}

export async function adminDeleteWatch(req: Request, res: Response) {
  const watch = await Watch.findByIdAndDelete(req.params.id);
  if (!watch) throw new ApiError(404, 'Timepiece not found');
  requestRedeploy(`watch:delete ${watch.slug}`);
  res.json({ message: 'Timepiece deleted' });
}
