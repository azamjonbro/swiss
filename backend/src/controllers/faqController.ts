import { Request, Response } from 'express';
import { Faq } from '../models/Faq';
import { ApiError } from '../utils/ApiError';
import { requestRedeploy } from '../services/deployHook';
import { localizeList, resolveLang } from '../utils/i18n';

const FAQ_FIELDS = ['question', 'answer'];

/** Ascending `order`, then oldest first — so a list nobody has ordered is still stable. */
const FAQ_SORT = { order: 1 as const, createdAt: 1 as const };

/**
 * A blank question or answer is not publishable — half a FAQ entry is a heading
 * with nothing under it — so both are trimmed here and required by the model.
 */
function sanitize(body: Record<string, unknown>): Record<string, unknown> {
  const out = { ...body };
  for (const key of ['question', 'answer'] as const) {
    if (key in out) out[key] = String(out[key] ?? '').trim();
  }
  delete out._id;
  delete out.createdAt;
  delete out.updatedAt;
  return out;
}

/** Public: the questions a visitor may be shown, in the requested language. */
export async function listFaqs(req: Request, res: Response) {
  const items = await Faq.find({ isActive: true }).sort(FAQ_SORT);
  res.json({ items: localizeList(items, resolveLang(req), FAQ_FIELDS) });
}

export async function adminListFaqs(_req: Request, res: Response) {
  const items = await Faq.find().sort(FAQ_SORT);
  res.json({ items });
}

export async function adminGetFaq(req: Request, res: Response) {
  const faq = await Faq.findById(req.params.id);
  if (!faq) throw new ApiError(404, 'FAQ not found');
  res.json(faq);
}

export async function adminCreateFaq(req: Request, res: Response) {
  const body = sanitize(req.body ?? {});
  if (!body.question) throw new ApiError(400, 'question is required');
  if (!body.answer) throw new ApiError(400, 'answer is required');

  const faq = await Faq.create(body);
  // Every product page carries the FAQ, and those pages are prerendered — so an
  // answer edited here reaches a crawler only after the next build.
  requestRedeploy(`faq:create ${faq.question}`);
  res.status(201).json(faq);
}

export async function adminUpdateFaq(req: Request, res: Response) {
  const faq = await Faq.findByIdAndUpdate(req.params.id, sanitize(req.body ?? {}), {
    new: true,
    runValidators: true,
  });
  if (!faq) throw new ApiError(404, 'FAQ not found');
  requestRedeploy(`faq:update ${faq.question}`);
  res.json(faq);
}

export async function adminDeleteFaq(req: Request, res: Response) {
  const faq = await Faq.findByIdAndDelete(req.params.id);
  if (!faq) throw new ApiError(404, 'FAQ not found');
  requestRedeploy(`faq:delete ${faq.question}`);
  res.json({ success: true });
}
