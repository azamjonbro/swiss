import { Request, Response } from 'express';
import { Watch } from '../models/Watch';
import { Category } from '../models/Category';
import { Brand } from '../models/Brand';
import { Inquiry } from '../models/Inquiry';

// Watches and accessories share one collection. The dashboard tiles link
// straight into the two admin lists, so they have to be counted the same way
// those lists filter — a "Total Watches" figure that silently included
// accessories would never match the page it opens. Records predating the
// `type` field have none, and count as watches.
const WATCHES = { type: { $ne: 'accessory' } } as const;
const ACCESSORIES = { type: 'accessory' } as const;

export async function getDashboardStats(_req: Request, res: Response) {
  const [totalWatches, totalAccessories, featuredWatches, totalCategories, totalBrands, newInquiries] =
    await Promise.all([
      Watch.countDocuments(WATCHES),
      Watch.countDocuments(ACCESSORIES),
      Watch.countDocuments({ ...WATCHES, featured: true }),
      Category.countDocuments(),
      Brand.countDocuments(),
      Inquiry.countDocuments({ status: 'new' }),
    ]);

  res.json({ totalWatches, totalAccessories, featuredWatches, totalCategories, totalBrands, newInquiries });
}
