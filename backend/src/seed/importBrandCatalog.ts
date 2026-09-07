/**
 * Loads the catalogues pulled by `scripts/fetch-brand.py` into the database.
 *
 * One `<brand>-import.json` per maison, each holding what that brand publishes
 * about its own watches: reference, series, audience, price, spec sheet and
 * photography. This script turns those into Watch documents, creates the
 * brand's category if it has none yet, and writes the product copy — composed
 * from the stored spec fields in all three site languages, so nothing is
 * invented and nothing reads as a template hole.
 *
 *     npm run import:brands            # every <brand>-import.json
 *     npm run import:brands -- tissot  # just one
 *
 * A watch whose slug is already in the database is left untouched: prices and
 * copy edited in the admin panel outrank anything a re-run would write. Pass
 * `--replace` to overwrite those instead.
 */
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { connectDatabase } from '../config/db';
import { toSlug } from '../utils/slug';
import { Brand } from '../models/Brand';
import { Category } from '../models/Category';
import { Watch } from '../models/Watch';

interface ImportProduct {
  reference: string;
  name: string;
  series: string;
  gender: 'men' | 'women';
  price: number;
  movement: string;
  caseMaterial: string;
  caseSize: string;
  dial: string;
  bracelet: string;
  waterResistance: string;
  description: string;
  images: string[];
  sourceUrl: string;
}

interface ImportFile {
  brand: string;
  source: string;
  fetchedAt: string;
  currency: string;
  products: ImportProduct[];
}

/** The movement word a shopper actually filters on, when the spec names one. */
function movementKind(movement: string): { en: string; ru: string; uz: string } | null {
  const value = movement.toLowerCase();
  if (value.includes('eco-drive')) return { en: 'Eco-Drive', ru: 'Eco-Drive', uz: 'Eco-Drive' };
  if (value.includes('automatic') || value.includes('mechanical'))
    return { en: 'automatic', ru: 'автоматические', uz: 'avtomatik' };
  if (value.includes('quartz')) return { en: 'quartz', ru: 'кварцевые', uz: 'kvarsli' };
  if (value.includes('solar')) return { en: 'solar', ru: 'на солнечной батарее', uz: 'quyosh batareyali' };
  return null;
}

/**
 * The spec sheet as a sentence, in one language.
 *
 * Every clause is dropped when its field is empty rather than printed with a
 * hole in it, and the Russian and Uzbek versions state the spec as
 * "label: value" — the values themselves (movement calibres, case materials)
 * are the manufacturer's own English wording, and bending them into a Russian
 * sentence would only produce broken grammar.
 */
function composeDescription(entry: ImportProduct, brand: string, lang: 'en' | 'ru' | 'uz'): string {
  const clauses: string[] = [];
  const { series, movement, caseMaterial, caseSize, dial, bracelet, waterResistance } = entry;

  if (lang === 'en') {
    clauses.push(
      series && series !== entry.name
        ? `The ${entry.name} belongs to ${brand}'s ${series} line.`
        : `The ${entry.name} is part of the ${brand} collection.`,
    );
    if (movement) clauses.push(`It runs a ${movement} movement.`);
    if (caseMaterial && caseSize) clauses.push(`The ${caseMaterial} case measures ${caseSize}.`);
    else if (caseMaterial) clauses.push(`The case is ${caseMaterial}.`);
    else if (caseSize) clauses.push(`The case measures ${caseSize}.`);
    if (dial) clauses.push(`${dial} dial.`);
    if (bracelet) clauses.push(`Fitted with ${bracelet.toLowerCase()}.`);
    if (waterResistance) clauses.push(`Water resistant to ${waterResistance}.`);
    return clauses.join(' ');
  }

  if (lang === 'ru') {
    clauses.push(
      series && series !== entry.name
        ? `${entry.name} — модель из линейки ${series} марки ${brand}.`
        : `${entry.name} — модель марки ${brand}.`,
    );
    if (movement) clauses.push(`Механизм: ${movement}.`);
    if (caseMaterial) clauses.push(`Корпус: ${caseMaterial}${caseSize ? `, ${caseSize}` : ''}.`);
    else if (caseSize) clauses.push(`Размер корпуса: ${caseSize}.`);
    if (dial) clauses.push(`Циферблат: ${dial}.`);
    if (bracelet) clauses.push(`Браслет/ремешок: ${bracelet}.`);
    if (waterResistance) clauses.push(`Водозащита: ${waterResistance}.`);
    return clauses.join(' ');
  }

  clauses.push(
    series && series !== entry.name
      ? `${entry.name} — ${brand} brendining ${series} liniyasidagi model.`
      : `${entry.name} — ${brand} brendining modeli.`,
  );
  if (movement) clauses.push(`Mexanizm: ${movement}.`);
  if (caseMaterial) clauses.push(`Korpus: ${caseMaterial}${caseSize ? `, ${caseSize}` : ''}.`);
  else if (caseSize) clauses.push(`Korpus o‘lchami: ${caseSize}.`);
  if (dial) clauses.push(`Siferblat: ${dial}.`);
  if (bracelet) clauses.push(`Tasma/brastlet: ${bracelet}.`);
  if (waterResistance) clauses.push(`Suvga chidamliligi: ${waterResistance}.`);
  return clauses.join(' ');
}

function composeShort(entry: ImportProduct, brand: string, lang: 'en' | 'ru' | 'uz'): string {
  const kind = movementKind(entry.movement);
  const women = entry.gender === 'women';
  if (lang === 'en') {
    return `${brand} ${entry.name} — ${kind ? `${kind.en} ` : ''}watch for ${women ? 'women' : 'men'}.`;
  }
  if (lang === 'ru') {
    return `${brand} ${entry.name} — ${kind ? `${kind.ru} ` : ''}часы для ${women ? 'женщин' : 'мужчин'}.`;
  }
  return `${brand} ${entry.name} — ${women ? 'ayollar' : 'erkaklar'} uchun ${kind ? `${kind.uz} ` : ''}soat.`;
}

async function importFile(file: string, replace: boolean): Promise<void> {
  const data = JSON.parse(fs.readFileSync(file, 'utf8')) as ImportFile;
  const brand = await Brand.findOne({ name: data.brand });
  if (!brand) {
    console.log(`  ! no brand named "${data.brand}" in the database — skipped`);
    return;
  }

  // Every brand with stock has a category of its own; that is how the existing
  // catalogue is organised, so a new maison gets the same treatment.
  const categorySlug = toSlug(data.brand);
  let category = await Category.findOne({ slug: categorySlug });
  if (!category) {
    category = await Category.create({ name: data.brand, slug: categorySlug, isActive: true });
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;
  let deactivated = 0;

  for (const entry of data.products) {
    if (!entry.images.length) continue;
    const slug = toSlug(`${data.brand} ${entry.name} ${entry.reference}`);
    const existing = await Watch.findOne({ slug });
    if (existing && !replace) {
      skipped += 1;
      continue;
    }

    // A brand that publishes no price (Saint Honoré, Jacques Philippe and West
    // End are showcases, not shops) imports switched off: the storefront would
    // otherwise price the watch at zero. The shop sets a price in the admin
    // panel and activates it there.
    const priced = entry.price > 0;
    if (!priced) deactivated += 1;

    const doc = {
      brand: brand._id,
      name: entry.name,
      slug,
      reference: entry.reference,
      price: entry.price,
      currency: 'USD',
      description: entry.description || composeDescription(entry, data.brand, 'en'),
      shortDescription: composeShort(entry, data.brand, 'en'),
      type: 'watch' as const,
      gender: entry.gender,
      variants: [
        {
          colorSlug: toSlug(entry.dial || 'standard'),
          colorLabel: entry.dial || 'Standard',
          images: entry.images,
          videos: [],
        },
      ],
      category: category._id,
      movement: entry.movement,
      caseMaterial: entry.caseMaterial,
      caseSize: entry.caseSize,
      dial: entry.dial,
      bracelet: entry.bracelet,
      waterResistance: entry.waterResistance,
      availability: 'in-stock' as const,
      featured: false,
      isNewArrival: false,
      isActive: priced,
      translations: {
        ru: {
          description: composeDescription(entry, data.brand, 'ru'),
          shortDescription: composeShort(entry, data.brand, 'ru'),
        },
        uz: {
          description: composeDescription(entry, data.brand, 'uz'),
          shortDescription: composeShort(entry, data.brand, 'uz'),
        },
      },
    };

    if (existing) {
      await Watch.updateOne({ _id: existing._id }, { $set: doc });
      updated += 1;
    } else {
      await Watch.create(doc);
      created += 1;
    }
  }

  console.log(
    `  ${data.brand}: ${created} created, ${updated} updated, ${skipped} already present` +
      (deactivated ? `, ${deactivated} imported deactivated (no published price)` : ''),
  );
}

async function run(): Promise<void> {
  const args = process.argv.slice(2);
  const replace = args.includes('--replace');
  const wanted = args.filter((a) => !a.startsWith('--'));

  const dir = __dirname;
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('-import.json') && f !== 'tsarbomba-import.json')
    .filter((f) => !wanted.length || wanted.some((w) => f.replace(/-/g, '').startsWith(w.replace(/-/g, ''))))
    .map((f) => path.join(dir, f));

  if (!files.length) {
    console.log('No catalogues to import. Run scripts/fetch-brand.py first.');
    return;
  }

  await connectDatabase();
  for (const file of files) {
    console.log(path.basename(file));
    await importFile(file, replace);
  }
  await mongoose.disconnect();
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
