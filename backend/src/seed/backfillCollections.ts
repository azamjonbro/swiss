/**
 * Creates the missing collections and files every product into one.
 *
 * The brand catalogues each publish a `series` per product — Tissot names 22 of
 * them, Citizen 18, Saint Honoré 13, Seiko 8 — but `importBrandCatalog.ts` only
 * ever used that field inside a sentence of product copy. Nothing created a
 * Collection from it and nothing set `collectionRef`, so /collections listed
 * the nine Tsar Bomba series and nothing else, and the catalogue's Collection
 * filter could only ever offer those nine.
 *
 * This reads the same `<brand>-import.json` files the importer reads, so the
 * series names and the products they belong to come from the manufacturer
 * rather than from a guess, and matches products by the slug the importer
 * builds. Products already filed in a collection are left alone.
 *
 *     npm run backfill:collections
 *     npm run backfill:collections -- --apply
 *     npm run backfill:collections -- tissot --apply
 */
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { connectDatabase } from '../config/db';
import { toSlug } from '../utils/slug';
import { Brand } from '../models/Brand';
import { Collection } from '../models/Collection';
import { Watch } from '../models/Watch';

interface ImportProduct {
  reference: string;
  name: string;
  series: string;
  gender: 'men' | 'women';
  images: string[];
}
interface ImportFile {
  brand: string;
  products: ImportProduct[];
}

/**
 * A series slug, kept short where it can be.
 *
 * "atomic" reads better than "tsar-bomba-atomic" and the nine existing
 * collections already use the bare form, so a name nobody else has claimed
 * keeps it. Only a genuine clash — two maisons with a "Classic" line — gets the
 * brand prefix, and only for the maison that arrives second.
 */
async function collectionSlug(series: string, brandName: string, brandId: mongoose.Types.ObjectId) {
  const bare = toSlug(series);
  const taken = await Collection.findOne({ slug: bare });
  if (!taken || String(taken.brand ?? '') === String(brandId)) return bare;
  return toSlug(`${brandName} ${series}`);
}

async function importFile(file: string, apply: boolean): Promise<void> {
  const data = JSON.parse(fs.readFileSync(file, 'utf8')) as ImportFile;
  const brand = await Brand.findOne({ name: data.brand });
  if (!brand) {
    console.log(`  ! no brand named "${data.brand}" in the database — skipped`);
    return;
  }

  // series name -> the products the catalogue puts in it
  const bySeries = new Map<string, ImportProduct[]>();
  for (const entry of data.products) {
    const series = (entry.series ?? '').trim();
    // A brand that publishes no series (Jacques Philippe) has no collections to
    // create, and inventing one called "Jacques Philippe" would be filler.
    if (!series || series === entry.name) continue;
    const list = bySeries.get(series) ?? [];
    list.push(entry);
    bySeries.set(series, list);
  }

  let created = 0;
  let filed = 0;
  let missing = 0;

  for (const [series, entries] of bySeries) {
    const slugs = entries.map((e) => toSlug(`${data.brand} ${e.name} ${e.reference}`));
    const watches = await Watch.find({ slug: { $in: slugs } }).select('_id gender collectionRef variants');
    if (!watches.length) {
      missing += 1;
      continue;
    }

    const slug = await collectionSlug(series, data.brand, brand._id as mongoose.Types.ObjectId);
    let collection = await Collection.findOne({ slug });

    if (!collection) {
      created += 1;
      if (apply) {
        // A women's line is a women's line only if that is what the catalogue
        // actually says about the pieces in it — counted, not assumed.
        const women = watches.filter((w) => w.gender === 'women').length;
        collection = await Collection.create({
          name: series,
          slug,
          brand: brand._id,
          // The line's own photography, taken from the first piece in it, so
          // the collections page has something to show rather than an empty
          // frame. Nothing is invented: it is a product shot the site already
          // serves.
          image: watches.find((w) => w.variants?.[0]?.images?.[0])?.variants[0].images[0] ?? '',
          gender: women > watches.length / 2 ? 'women' : 'men',
          description: `${series} — ${data.brand}.`,
          isActive: true,
        });
      }
    }

    if (!apply || !collection) continue;

    // Only products with no collection yet: a piece filed by hand in the admin
    // panel outranks anything this can work out from a catalogue file.
    const unfiled = watches.filter((w) => !w.collectionRef);
    if (unfiled.length) {
      await Watch.updateMany({ _id: { $in: unfiled.map((w) => w._id) } }, { $set: { collectionRef: collection._id } });
      filed += unfiled.length;
    }
    // The denormalised side of the same link — getCollectionBySlug reads it.
    await Collection.updateOne(
      { _id: collection._id },
      { $addToSet: { watches: { $each: watches.map((w) => w._id) } } },
    );
  }

  console.log(
    `  ${data.brand}: ${bySeries.size} series in the catalogue, ${created} collection(s) ` +
      `${apply ? 'created' : 'would be created'}, ${filed} product(s) filed` +
      (missing ? `, ${missing} series has no imported products yet` : ''),
  );
}

async function run(): Promise<void> {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const wanted = args.filter((a) => !a.startsWith('--'));

  const dir = __dirname;
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('-import.json'))
    .filter((f) => !wanted.length || wanted.some((w) => f.replace(/-/g, '').startsWith(w.replace(/-/g, ''))))
    .map((f) => path.join(dir, f));

  await connectDatabase();
  for (const file of files) {
    console.log(path.basename(file));
    await importFile(file, apply);
  }
  if (!apply) console.log('\nDry run. Re-run with --apply to write.');

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
