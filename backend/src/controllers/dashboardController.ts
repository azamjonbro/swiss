import { Request, Response } from 'express';
import { Watch } from '../models/Watch';
import { Category } from '../models/Category';
import { Brand } from '../models/Brand';
import { Inquiry } from '../models/Inquiry';

export async function getDashboardStats(_req: Request, res: Response) {
  const [totalWatches, featuredWatches, totalCategories, totalBrands, newInquiries] = await Promise.all([
    Watch.countDocuments(),
    Watch.countDocuments({ featured: true }),
    Category.countDocuments(),
    Brand.countDocuments(),
    Inquiry.countDocuments({ status: 'new' }),
  ]);

  res.json({ totalWatches, featuredWatches, totalCategories, totalBrands, newInquiries });
}
