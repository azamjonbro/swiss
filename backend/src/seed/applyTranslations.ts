import mongoose from 'mongoose';
import { connectDatabase } from '../config/db';
import { toSlug } from '../utils/slug';
import { Brand } from '../models/Brand';
import { Category } from '../models/Category';
import { Watch } from '../models/Watch';
import { Collection } from '../models/Collection';
import { BRANDS, WATCHES, COLLECTIONS_I18N } from './seed';

/**
 * Non-destructive: only $set's the `translations` field on documents that
 * already exist (matched by slug). Never deletes or recreates data, so it's
 * safe to run against a database that already has admin edits in it.
 */
async function applyTranslations() {
  await connectDatabase();

  let updated = 0;

  for (const b of BRANDS) {
    const slug = toSlug(b.name);
    const translations = { ru: { description: b.descriptionRu }, uz: { description: b.descriptionUz } };
    const brandRes = await Brand.updateOne({ slug }, { $set: { translations } });
    const categoryRes = await Category.updateOne(
      { slug },
      { $set: { translations: { ru: { description: b.descriptionRu, tagline: b.taglineRu }, uz: { description: b.descriptionUz, tagline: b.taglineUz } } } },
    );
    updated += brandRes.matchedCount + categoryRes.matchedCount;
  }

  for (const w of WATCHES) {
    const slug = toSlug(`${w.brand}-${w.name}-${w.reference}`);
    const translations = {
      ru: { shortDescription: w.shortDescriptionRu, description: w.descriptionRu },
      uz: { shortDescription: w.shortDescriptionUz, description: w.descriptionUz },
    };
    const res = await Watch.updateOne({ slug }, { $set: { translations } });
    updated += res.matchedCount;
  }

  for (const [slug, i18n] of Object.entries(COLLECTIONS_I18N)) {
    const translations = {
      ru: { name: i18n.name.ru, description: i18n.description.ru },
      uz: { name: i18n.name.uz, description: i18n.description.uz },
    };
    const res = await Collection.updateOne({ slug }, { $set: { translations } });
    updated += res.matchedCount;
  }

  console.log(`[translate] matched & updated ${updated} documents with ru/uz translations.`);
  await mongoose.disconnect();
  process.exit(0);
}

applyTranslations().catch((err) => {
  console.error('[translate] failed', err);
  process.exit(1);
});
