import { Request, Response } from 'express';
import { Collection } from '../models/Collection';
import { ApiError } from '../utils/ApiError';
import { toSlug } from '../utils/slug';
import { localize, localizeList, resolveLang } from '../utils/i18n';

const COLLECTION_FIELDS = ['name', 'description'];
const WATCH_FIELDS = ['name', 'description', 'shortDescription'];
const BRAND_FIELDS = ['name', 'description'];

export async function listCollections(req: Request, res: Response) {
  const items = await Collection.find({ isActive: true }).sort({ createdAt: -1 });
  res.json({ items: localizeList(items, resolveLang(req), COLLECTION_FIELDS) });
}

export async function getCollectionBySlug(req: Request, res: Response) {
  const collection = await Collection.findOne({ slug: req.params.slug, isActive: true }).populate({
    path: 'watches',
    match: { isActive: true },
    populate: [{ path: 'brand', select: 'name slug translations' }],
  });
  if (!collection) throw new ApiError(404, 'Collection not found');

  const lang = resolveLang(req);
  const localized = localize(collection, lang, COLLECTION_FIELDS) as unknown as Record<string, unknown>;
  if (Array.isArray(localized.watches)) {
    localized.watches = localized.watches.map((w: Record<string, unknown>) => {
      const watch = localize(w, lang, WATCH_FIELDS);
      if (watch.brand && typeof watch.brand === 'object') {
        watch.brand = localize(watch.brand as Record<string, unknown>, lang, BRAND_FIELDS);
      }
      return watch;
    });
  }
  res.json(localized);
}

export async function adminListCollections(_req: Request, res: Response) {
  const items = await Collection.find().sort({ createdAt: -1 });
  res.json({ items });
}

export async function adminCreateCollection(req: Request, res: Response) {
  const body = req.body;
  if (!body.name) throw new ApiError(400, 'name is required');

  const slug = body.slug ? toSlug(body.slug) : toSlug(body.name);
  const collection = await Collection.create({ ...body, slug });
  res.status(201).json(collection);
}

export async function adminUpdateCollection(req: Request, res: Response) {
  const body = { ...req.body };
  if (body.slug) body.slug = toSlug(body.slug);

  const collection = await Collection.findByIdAndUpdate(req.params.id, body, { new: true, runValidators: true });
  if (!collection) throw new ApiError(404, 'Collection not found');
  res.json(collection);
}

export async function adminDeleteCollection(req: Request, res: Response) {
  const collection = await Collection.findByIdAndDelete(req.params.id);
  if (!collection) throw new ApiError(404, 'Collection not found');
  res.json({ message: 'Collection deleted' });
}
