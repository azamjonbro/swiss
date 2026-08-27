import { Request, Response } from 'express';
import { Brand } from '../models/Brand';
import { ApiError } from '../utils/ApiError';
import { toSlug } from '../utils/slug';
import { requestRedeploy } from '../services/deployHook';
import { localize, localizeList, resolveLang } from '../utils/i18n';

const BRAND_FIELDS = ['name', 'description'];

export async function listBrands(req: Request, res: Response) {
  const filter: Record<string, unknown> = { isActive: true };
  if (req.query.featured !== undefined) filter.featured = req.query.featured === 'true';
  const items = await Brand.find(filter).sort({ name: 1 });
  res.json({ items: localizeList(items, resolveLang(req), BRAND_FIELDS) });
}

export async function getBrandBySlug(req: Request, res: Response) {
  const brand = await Brand.findOne({ slug: req.params.slug, isActive: true });
  if (!brand) throw new ApiError(404, 'Brand not found');
  res.json(localize(brand, resolveLang(req), BRAND_FIELDS));
}

export async function adminListBrands(_req: Request, res: Response) {
  const items = await Brand.find().sort({ name: 1 });
  res.json({ items });
}

export async function adminCreateBrand(req: Request, res: Response) {
  const body = req.body;
  if (!body.name) throw new ApiError(400, 'name is required');

  const slug = body.slug ? toSlug(body.slug) : toSlug(body.name);
  const brand = await Brand.create({ ...body, slug });
  requestRedeploy(`brand:create ${brand.slug}`);
  res.status(201).json(brand);
}

export async function adminUpdateBrand(req: Request, res: Response) {
  const body = { ...req.body };
  if (body.slug) body.slug = toSlug(body.slug);

  const brand = await Brand.findByIdAndUpdate(req.params.id, body, { new: true, runValidators: true });
  if (!brand) throw new ApiError(404, 'Brand not found');
  requestRedeploy(`brand:update ${brand.slug}`);
  res.json(brand);
}

export async function adminDeleteBrand(req: Request, res: Response) {
  const brand = await Brand.findByIdAndDelete(req.params.id);
  if (!brand) throw new ApiError(404, 'Brand not found');
  requestRedeploy(`brand:delete ${brand.slug}`);
  res.json({ message: 'Brand deleted' });
}
