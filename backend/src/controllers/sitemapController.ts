import { Request, Response } from 'express';
import { Watch } from '../models/Watch';
import { Brand } from '../models/Brand';
import { Collection } from '../models/Collection';
import { env } from '../config/env';

const STATIC_PATHS = ['', '/watches', '/brands', '/collections', '/about', '/contact'];

export async function getSitemap(_req: Request, res: Response) {
  const [watches, brands, collections] = await Promise.all([
    Watch.find({ isActive: true }).select('slug updatedAt'),
    Brand.find({ isActive: true }).select('slug'),
    Collection.find({ isActive: true }).select('slug'),
  ]);

  const urls: string[] = [];

  for (const path of STATIC_PATHS) {
    urls.push(`${env.clientUrl}${path}`);
  }
  for (const w of watches) urls.push(`${env.clientUrl}/watches/${w.slug}`);
  for (const b of brands) urls.push(`${env.clientUrl}/brands/${b.slug}`);
  for (const c of collections) urls.push(`${env.clientUrl}/collections/${c.slug}`);

  const body = urls.map((url) => `  <url><loc>${url}</loc></url>`).join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>`;

  res.type('application/xml').send(xml);
}
