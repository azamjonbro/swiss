/**
 * Stamps `modelGroup` onto every product already in the database.
 *
 * New and edited products get the key from the controller; this is for the ~900
 * that were imported before the field existed. Until it runs, the grouped
 * listing falls back to one group per product — the same twenty-one PRX 40mm
 * cards as before — so nothing breaks, nothing improves either.
 *
 * Non-destructive: it writes one derived string per document and touches
 * nothing else. Safe to re-run.
 *
 *     npm run backfill:models          # report what would change
 *     npm run backfill:models -- --apply
 */
import mongoose from 'mongoose';
import { connectDatabase } from '../config/db';
import { Watch } from '../models/Watch';
import { Brand } from '../models/Brand';
import { modelGroupKey } from '../utils/modelGroup';

async function run(): Promise<void> {
  const apply = process.argv.includes('--apply');
  await connectDatabase();

  const watches = await Watch.find({}).select('name brand type modelGroup slug price');
  const brands = await Brand.find({}).select('name');
  const brandName = new Map(brands.map((b) => [String(b._id), b.name]));

  // brand|type|key -> the products that would share a card
  const groups = new Map<string, { name: string; brand: string; slugs: string[]; prices: number[] }>();
  let changed = 0;

  for (const watch of watches) {
    const key = modelGroupKey(watch.name);
    if (watch.modelGroup !== key) {
      changed += 1;
      if (apply) await Watch.updateOne({ _id: watch._id }, { $set: { modelGroup: key } });
    }
    const id = `${String(watch.brand)}|${watch.type}|${key}`;
    const entry = groups.get(id) ?? {
      name: watch.name,
      brand: brandName.get(String(watch.brand)) ?? '?',
      slugs: [],
      prices: [],
    };
    entry.slugs.push(watch.slug);
    entry.prices.push(watch.price);
    groups.set(id, entry);
  }

  const multi = [...groups.values()].filter((g) => g.slugs.length > 1).sort((a, b) => b.slugs.length - a.slugs.length);

  console.log(`${watches.length} products -> ${groups.size} models on the grid`);
  console.log(`${changed} document(s) ${apply ? 'updated' : 'would be updated'}`);
  console.log(`${multi.length} model(s) hold more than one colourway:`);
  for (const g of multi.slice(0, 20)) {
    const lo = Math.min(...g.prices);
    const hi = Math.max(...g.prices);
    const price = lo === hi ? `$${lo}` : `$${lo}-${hi}`;
    console.log(`  ${String(g.slugs.length).padStart(3)}x  ${g.brand} ${g.name}  ${price}`);
  }
  if (multi.length > 20) console.log(`  … and ${multi.length - 20} more`);
  if (!apply) console.log('\nDry run. Re-run with --apply to write.');

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
