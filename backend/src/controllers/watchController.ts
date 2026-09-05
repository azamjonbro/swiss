import { Request, Response } from 'express';
import { Types } from 'mongoose';
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

  // The storefront's catalogue page fetches once and filters client-side, so
  // this cap has to clear the whole catalogue or products simply vanish from
  // it. It was set for the ~90 Tsar Bomba products; with Roamer, Cerruti and
  // Swiss Military Hanowa added the catalogue is past 290, and a 150 cap was
  // silently withholding half of it. Kept bounded rather than removed — an
  // open limit is a cheap way to ask the server for everything at once.
  const pageSize = Math.min(Number(limit) || 24, 600);
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
  const { q, page, limit, brand, category, type } = req.query;
  const filter: Record<string, unknown> = {};
  if (q) {
    const search = await buildSearchFilter(String(q));
    if (search) Object.assign(filter, search);
  }
  if (brand) filter.brand = brand;
  if (category) filter.category = category;
  // Watches and accessories share this collection but are managed as separate
  // sections in the admin. Absent means "both", which is what any older caller
  // expects. `watch` is expressed as "not an accessory" so that records
  // predating the `type` field — which carry no `type` at all, the schema
  // default having only ever applied on create — still appear in the watch
  // list rather than falling out of the admin entirely.
  if (type === 'accessory') filter.type = 'accessory';
  else if (type === 'watch') filter.type = { $ne: 'accessory' };

  const pageSize = Math.min(Number(limit) || 20, 100);
  const pageNum = Math.max(Number(page) || 1, 1);

  const [items, total] = await Promise.all([
    Watch.find(filter)
      // `translations` comes along so the admin table and its filters can show
      // brand and category names in the chosen language. Localising this
      // server-side would be wrong: the same records feed the brand and
      // category *edit* forms, where the base name is the field being edited —
      // handing those a translated value would overwrite the original on save.
      .populate('brand', 'name translations')
      .populate('category', 'name translations')
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

/**
 * Deletes several products in one request.
 *
 * A loop of single deletes from the browser would fire one redeploy per
 * product — the storefront prerenders its catalogue, so clearing fifty items
 * would queue fifty rebuilds. This deletes them together and asks for one.
 */
export async function adminBulkDeleteWatches(req: Request, res: Response) {
  const { ids } = req.body as { ids?: unknown };
  if (!Array.isArray(ids) || !ids.length) throw new ApiError(400, 'ids must be a non-empty array');
  // Bounded so a malformed client cannot ask to delete the whole catalogue in
  // one call; the admin UI pages at 50.
  if (ids.length > 100) throw new ApiError(400, 'No more than 100 products can be deleted at once');

  const valid = ids.filter((id): id is string => typeof id === 'string' && Types.ObjectId.isValid(id));
  if (!valid.length) throw new ApiError(400, 'No valid product ids were provided');

  const result = await Watch.deleteMany({ _id: { $in: valid } });
  if (result.deletedCount) requestRedeploy(`watch:bulk-delete ${result.deletedCount}`);

  res.json({ message: 'Products deleted', deletedCount: result.deletedCount });
}

export async function adminDeleteWatch(req: Request, res: Response) {
  const watch = await Watch.findByIdAndDelete(req.params.id);
  if (!watch) throw new ApiError(404, 'Timepiece not found');
  requestRedeploy(`watch:delete ${watch.slug}`);
  res.json({ message: 'Timepiece deleted' });
}
