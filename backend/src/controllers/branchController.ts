import { Request, Response } from 'express';
import { Branch } from '../models/Branch';
import { ApiError } from '../utils/ApiError';
import { requestRedeploy } from '../services/deployHook';
import { localizeList, resolveLang } from '../utils/i18n';

const BRANCH_FIELDS = ['name', 'streetAddress', 'addressLocality', 'addressRegion'];

/** Ascending `order`, then oldest first — so a list nobody has ordered is still stable. */
const BRANCH_SORT = { order: 1 as const, createdAt: 1 as const };

/**
 * Trims the string arrays and drops a half-filled `geo`.
 *
 * The admin form posts an empty row for every field the operator did not fill,
 * and an empty string in `phones` becomes a `tel:` link to nowhere on the
 * storefront. A coordinate pair with one number missing is worse still: it
 * would be published as a `GeoCoordinates` node claiming a point on the
 * equator, so it is dropped rather than half-published.
 */
function sanitize(body: Record<string, unknown>): Record<string, unknown> {
  const out = { ...body };

  for (const key of ['phones', 'openingHours'] as const) {
    if (key in out) {
      const raw = Array.isArray(out[key]) ? (out[key] as unknown[]) : [];
      out[key] = raw.map((entry) => String(entry ?? '').trim()).filter(Boolean);
    }
  }

  if ('geo' in out) {
    const geo = out.geo as { latitude?: unknown; longitude?: unknown } | null | undefined;
    const lat = Number(geo?.latitude);
    const lng = Number(geo?.longitude);
    out.geo = Number.isFinite(lat) && Number.isFinite(lng) ? { latitude: lat, longitude: lng } : undefined;
  }

  // Never settable from a request body — Mongoose manages both.
  delete out._id;
  delete out.createdAt;
  delete out.updatedAt;
  return out;
}

/** Public: the branches a visitor may be shown. */
export async function listBranches(req: Request, res: Response) {
  const items = await Branch.find({ isActive: true }).sort(BRANCH_SORT);
  res.json({ items: localizeList(items, resolveLang(req), BRANCH_FIELDS) });
}

export async function adminListBranches(_req: Request, res: Response) {
  const items = await Branch.find().sort(BRANCH_SORT);
  res.json({ items });
}

export async function adminGetBranch(req: Request, res: Response) {
  const branch = await Branch.findById(req.params.id);
  if (!branch) throw new ApiError(404, 'Branch not found');
  res.json(branch);
}

export async function adminCreateBranch(req: Request, res: Response) {
  const body = sanitize(req.body ?? {});
  if (!body.name) throw new ApiError(400, 'name is required');

  const branch = await Branch.create(body);
  // The /stores page, its JSON-LD and the sitemap are prerendered from
  // src/data/locations.json, which the storefront build syncs from this
  // endpoint — so an address added here is only public after a deploy.
  requestRedeploy(`branch:create ${branch.name}`);
  res.status(201).json(branch);
}

export async function adminUpdateBranch(req: Request, res: Response) {
  const branch = await Branch.findByIdAndUpdate(req.params.id, sanitize(req.body ?? {}), {
    new: true,
    runValidators: true,
  });
  if (!branch) throw new ApiError(404, 'Branch not found');
  requestRedeploy(`branch:update ${branch.name}`);
  res.json(branch);
}

export async function adminDeleteBranch(req: Request, res: Response) {
  const branch = await Branch.findByIdAndDelete(req.params.id);
  if (!branch) throw new ApiError(404, 'Branch not found');
  requestRedeploy(`branch:delete ${branch.name}`);
  res.json({ success: true });
}
