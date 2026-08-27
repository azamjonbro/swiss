/**
 * Imports the catalogue pulled by `scripts/fetch-tsarbomba.py` and rebuilds the
 * collections to match how Tsar Bomba actually organises its line-up: eight men's
 * series plus the women's Nucleus Femme collection.
 *
 * Watches already in the database are left alone — their copy and spec sheets were
 * written by hand in `seed.ts` — but every watch gets its series, audience, and
 * collection membership set from the brand's own grouping. Run after `npm run seed`:
 *
 *     npm run import:catalog
 */
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { connectDatabase } from '../config/db';
import { toSlug } from '../utils/slug';
import { Brand } from '../models/Brand';
import { Category } from '../models/Category';
import { Collection } from '../models/Collection';
import { Watch } from '../models/Watch';

type Gender = 'men' | 'women';

interface ImportVariant {
  colorLabel: string;
  images: string[];
}

interface ImportEntry {
  type: 'watch' | 'accessory';
  reference: string;
  title: string;
  handle: string;
  series: string;
  women: boolean;
  price: number;
  movement: '' | 'automatic' | 'quartz';
  material: '' | 'carbon' | 'ceramic' | 'titanium' | 'steel';
  chronograph: boolean;
  skeleton: boolean;
  sapphire: boolean;
  interchangeable: boolean;
  variants: ImportVariant[];
}

/** The nine collections tsarbomba.com publishes, in the order its menu lists them. */
const SERIES: Array<{
  name: string;
  gender: Gender;
  description: string;
  descriptionRu: string;
  descriptionUz: string;
  nameRu: string;
  nameUz: string;
}> = [
  {
    name: 'Elemental',
    gender: 'men',
    nameRu: 'Elemental',
    nameUz: 'Elemental',
    description: 'The everyday Tsar Bomba — automatic and quartz calendars in steel, ceramic, and carbon fibre.',
    descriptionRu: 'Повседневная Tsar Bomba — автоматические и кварцевые календари в стали, керамике и карбоне.',
    descriptionUz: "Kundalik Tsar Bomba — po'lat, keramika va uglerod tolasidagi avtomatik va kvarsli kalendarlar.",
  },
  {
    name: 'Atomic',
    gender: 'men',
    nameRu: 'Atomic',
    nameUz: 'Atomic',
    description: 'The interchangeable platform: one movement, swappable cases, bezels, crowns, and straps.',
    descriptionRu: 'Сменная платформа: один механизм, взаимозаменяемые корпуса, безели, заводные головки и ремешки.',
    descriptionUz: "Almashtiriladigan platforma: bitta mexanizm, almashtiriladigan korpus, bezel, toj va tasmalar.",
  },
  {
    name: 'Dark Matter',
    gender: 'men',
    nameRu: 'Dark Matter',
    nameUz: 'Dark Matter',
    description: 'Skeletonised automatics with sculpted, openworked movements on show.',
    descriptionRu: 'Скелетонированные автоматы с открытыми, рельефными механизмами.',
    descriptionUz: "Ochiq, o'ymakor mexanizmli skeleton avtomatik soatlar.",
  },
  {
    name: 'Light Matter',
    gender: 'men',
    nameRu: 'Light Matter',
    nameUz: 'Light Matter',
    description: 'Sapphire bezels over a Chronite® case — the brightest end of the line-up.',
    descriptionRu: 'Сапфировые безели на корпусе Chronite® — самая светлая часть коллекции.',
    descriptionUz: "Chronite® korpus ustidagi safir bezel — kolleksiyaning eng yorqin qismi.",
  },
  {
    name: 'Neutron',
    gender: 'men',
    nameRu: 'Neutron',
    nameUz: 'Neutron',
    description: 'Limited runs built around a single, uncompromising case design.',
    descriptionRu: 'Лимитированные серии вокруг одного бескомпромиссного корпуса.',
    descriptionUz: "Bitta murosasiz korpus dizayni atrofida qurilgan cheklangan seriyalar.",
  },
  {
    name: 'Reactor',
    gender: 'men',
    nameRu: 'Reactor',
    nameUz: 'Reactor',
    description: 'Industrial architecture — exposed screws, hard angles, and modular parts.',
    descriptionRu: 'Индустриальная архитектура — открытые винты, жёсткие углы и модульные детали.',
    descriptionUz: "Sanoat arxitekturasi — ochiq vintlar, keskin burchaklar va modulli qismlar.",
  },
  {
    name: 'Electron',
    gender: 'men',
    nameRu: 'Electron',
    nameUz: 'Electron',
    description: 'Carbon-forged cases at the lightest weight Tsar Bomba builds.',
    descriptionRu: 'Кованый карбон — самые лёгкие корпуса Tsar Bomba.',
    descriptionUz: "Uglerodli korpuslar — Tsar Bomba yasagan eng yengil soatlar.",
  },
  {
    name: 'Skunk Works',
    gender: 'men',
    nameRu: 'Skunk Works',
    nameUz: 'Skunk Works',
    description: 'The experimental workshop: pre-order pieces that test what comes next.',
    descriptionRu: 'Экспериментальная мастерская: предзаказные модели, задающие будущее бренда.',
    descriptionUz: "Tajriba ustaxonasi: brendning kelajagini sinovdan o'tkazuvchi oldindan buyurtma modellari.",
  },
  {
    name: 'Nucleus Femme',
    gender: 'women',
    nameRu: 'Nucleus Femme',
    nameUz: 'Nucleus Femme',
    description: 'Refined timepieces for the modern woman — smaller cases, lighter bracelets, the same mechanics.',
    descriptionRu: 'Изысканные часы для современной женщины — компактные корпуса, лёгкие браслеты, та же механика.',
    descriptionUz: "Zamonaviy ayol uchun nafis soatlar — ixcham korpus, yengil bilaguzuk, o'sha mexanika.",
  },
];

/**
 * Which series an already-seeded watch belongs to. The hand-written catalogue names
 * its watches after the series ("Elemental-TB8208A", "Dark Matter 2", "Parallax"),
 * so the name carries the answer — except for a handful of one-off model names that
 * tsarbomba.com files under a series their name does not mention.
 */
const SERIES_BY_NAME: Array<[RegExp, string]> = [
  [/^elemental|^tb8204|^tb8208/i, 'Elemental'],
  [/^atomic/i, 'Atomic'],
  [/^dark matter/i, 'Dark Matter'],
  [/^light matter/i, 'Light Matter'],
  [/^neutron/i, 'Neutron'],
  [/^reactor|^parallax/i, 'Reactor'],
  [/^electron/i, 'Electron'],
  [/^skunk works/i, 'Skunk Works'],
  [/^nucleus femme|^lumina/i, 'Nucleus Femme'],
];

/** References tsarbomba.com lists under Women Watches. */
const WOMEN_REFERENCES = new Set(['TB8215', 'TB8219', 'TB8220L', 'TB8231L', 'TB8233LG', 'TB8208D']);

const COLOR_RU: Record<string, string> = {
  black: 'чёрный', white: 'белый', blue: 'синий', red: 'красный', green: 'зелёный',
  yellow: 'жёлтый', orange: 'оранжевый', grey: 'серый', gray: 'серый', gold: 'золотой',
  golden: 'золотой', silver: 'серебристый', sliver: 'серебристый', rose: 'розовый',
  olive: 'оливковый', light: 'светлый', dark: 'тёмный', ceramic: 'керамика',
  carbon: 'карбон', fiber: 'волокно', lake: 'озёрный', klein: 'кляйн', elite: 'элитный',
  bull: 'бычий', passion: 'страстный', elegant: 'элегантный', cool: 'холодный',
  ghost: 'призрачный', diamond: 'бриллиант', zirconia: 'цирконий', titanium: 'титан',
  dynamic: 'динамичный', fluororubber: 'фторкаучук', pin: 'штифт', steel: 'сталь',
};

const COLOR_UZ: Record<string, string> = {
  black: 'qora', white: 'oq', blue: "ko'k", red: 'qizil', green: 'yashil',
  yellow: 'sariq', orange: "to'q sariq", grey: 'kulrang', gray: 'kulrang', gold: 'oltin',
  golden: 'oltin', silver: 'kumush', sliver: 'kumush', rose: 'pushti',
  olive: 'zaytun', light: 'och', dark: "to'q", ceramic: 'keramika',
  carbon: 'uglerod', fiber: 'tola', lake: "ko'l", klein: 'klyayn', elite: 'elit',
  bull: 'buqa', passion: 'ehtirosli', elegant: 'nafis', cool: 'sovuq',
  ghost: 'arvoh', diamond: 'olmos', zirconia: 'sirkoniy', titanium: 'titan',
  dynamic: 'dinamik', fluororubber: 'ftorkauchuk', pin: 'ignali', steel: "po'lat",
};

function translateColor(label: string, dict: Record<string, string>): string {
  if (!label) return '';
  const words = label
    .split(/[\s-]+/)
    .map((word) => dict[word.toLowerCase()] ?? word)
    .filter(Boolean);
  const joined = words.join(' ');
  return joined.charAt(0).toUpperCase() + joined.slice(1);
}

const MOVEMENT: Record<string, [string, string, string]> = {
  automatic: ['Automatic', 'Автоподзавод', 'Avtomatik'],
  quartz: ['Quartz', 'Кварцевый', 'Kvarsli'],
};

const MATERIAL: Record<string, [string, string, string]> = {
  carbon: ['Forged carbon fibre', 'Кованое углеродное волокно', 'Presslangan uglerod tolasi'],
  ceramic: ['Ceramic', 'Керамика', 'Keramika'],
  titanium: ['Titanium', 'Титан', 'Titan'],
  steel: ['Stainless steel', 'Нержавеющая сталь', 'Zanglamas poʻlat'],
};

/**
 * Product copy from what the brand actually publishes. Shopify's `body_html` on every
 * listing is shipping boilerplate, and no spec sheet is exposed, so the description is
 * assembled from the facts we do have — series, movement, case material, colourways —
 * and the remaining spec fields are left blank for an editor to fill in.
 */
function buildCopy(entry: ImportEntry, colorCount: number) {
  if (entry.type === 'accessory') {
    const forSeries = entry.series ? ` ${entry.series}` : '';
    const finish = (count: number, en: string, ru: string, uz: string) =>
      count > 1 ? [en, ru, uz] : ['', '', ''];
    const [enTail, ruTail, uzTail] = finish(
      colorCount,
      ` Available in ${colorCount} finishes.`,
      ` Доступен в ${colorCount} вариантах.`,
      ` ${colorCount} ta variantda mavjud.`,
    );
    return {
      shortDescription: `Tsar Bomba${forSeries} accessory.`,
      shortDescriptionRu: `Аксессуар Tsar Bomba${forSeries}.`,
      shortDescriptionUz: `Tsar Bomba${forSeries} aksessuari.`,
      description: `${entry.title} — an official Tsar Bomba${forSeries} accessory.${enTail}`,
      descriptionRu: `${entry.title} — оригинальный аксессуар Tsar Bomba${forSeries}.${ruTail}`,
      descriptionUz: `${entry.title} — Tsar Bomba${forSeries} uchun original aksessuar.${uzTail}`,
    };
  }

  const movement = entry.movement ? MOVEMENT[entry.movement] : null;
  const material = entry.material ? MATERIAL[entry.material] : null;
  const audience = entry.women
    ? ['women', 'женщин', 'ayollar']
    : ['men', 'мужчин', 'erkaklar'];

  const traits: string[] = [];
  const traitsRu: string[] = [];
  const traitsUz: string[] = [];
  if (entry.skeleton) {
    traits.push('an openworked, skeletonised dial');
    traitsRu.push('скелетонированный циферблат');
    traitsUz.push("o'ymakor skeleton siferblat");
  }
  if (entry.chronograph) {
    traits.push('chronograph counters');
    traitsRu.push('хронографные счётчики');
    traitsUz.push('xronograf hisoblagichlari');
  }
  if (entry.sapphire) {
    traits.push('a sapphire crystal');
    traitsRu.push('сапфировое стекло');
    traitsUz.push('safir shisha');
  }
  if (entry.interchangeable) {
    traits.push('an interchangeable case, bezel, and strap system');
    traitsRu.push('систему сменных корпуса, безеля и ремешка');
    traitsUz.push('almashtiriladigan korpus, bezel va tasma tizimi');
  }

  const list = (items: string[], joiner: string) =>
    items.length === 0 ? '' : items.length === 1 ? items[0] : `${items.slice(0, -1).join(', ')} ${joiner} ${items[items.length - 1]}`;

  const shortDescription = [
    `${entry.series} ${entry.reference}`,
    movement ? `${movement[0].toLowerCase()} watch` : 'timepiece',
    `for ${audience[0]}`,
    colorCount > 1 ? `in ${colorCount} colourways.` : '.',
  ].join(' ').replace(' .', '.');

  const shortDescriptionRu = [
    `${entry.series} ${entry.reference} —`,
    movement ? `${movement[1].toLowerCase()} часы` : 'часы',
    `для ${audience[1]}`,
    colorCount > 1 ? `в ${colorCount} расцветках.` : '.',
  ].join(' ').replace(' .', '.');

  const shortDescriptionUz = [
    `${entry.series} ${entry.reference} —`,
    `${audience[2]} uchun`,
    movement ? `${movement[2].toLowerCase()} soat` : 'soat',
    colorCount > 1 ? `${colorCount} ta rang variantida.` : '.',
  ].join(' ').replace(' .', '.');

  const description = [
    `The ${entry.series} ${entry.reference} sits in Tsar Bomba's ${entry.series} collection.`,
    movement ? `It runs a ${movement[0].toLowerCase()} movement.` : '',
    material ? `The case is ${material[0].toLowerCase()}.` : '',
    traits.length ? `It carries ${list(traits, 'and')}.` : '',
    colorCount > 1 ? `Offered in ${colorCount} colourways.` : '',
  ].filter(Boolean).join(' ');

  const descriptionRu = [
    `${entry.series} ${entry.reference} входит в коллекцию ${entry.series} от Tsar Bomba.`,
    movement ? `Механизм — ${movement[1].toLowerCase()}.` : '',
    material ? `Корпус — ${material[1].toLowerCase()}.` : '',
    traitsRu.length ? `Модель получила ${list(traitsRu, 'и')}.` : '',
    colorCount > 1 ? `Доступна в ${colorCount} расцветках.` : '',
  ].filter(Boolean).join(' ');

  const descriptionUz = [
    `${entry.series} ${entry.reference} — Tsar Bomba'ning ${entry.series} kolleksiyasidan.`,
    movement ? `Mexanizmi — ${movement[2].toLowerCase()}.` : '',
    material ? `Korpusi — ${material[2].toLowerCase()}.` : '',
    traitsUz.length ? `Modelda ${list(traitsUz, 'va')} bor.` : '',
    colorCount > 1 ? `${colorCount} ta rang variantida taklif etiladi.` : '',
  ].filter(Boolean).join(' ');

  return { shortDescription, shortDescriptionRu, shortDescriptionUz, description, descriptionRu, descriptionUz };
}

/** Product URL slug; see the call site for why the reference is sometimes dropped. */
function slugFor(brandName: string, name: string, reference: string, type: string): string {
  const base = toSlug(`${brandName}-${name}`);
  // An accessory has no model number — the fetcher derives its "reference" from the
  // title — so the name alone is its identity. Appending anything only ever repeats it.
  if (type === 'accessory') return base;
  const ref = toSlug(reference);
  if (!ref || base === ref || base.endsWith(`-${ref}`)) return base;
  return toSlug(`${base}-${ref}`);
}

function seriesOf(name: string): string {
  for (const [pattern, series] of SERIES_BY_NAME) {
    if (pattern.test(name)) return series;
  }
  return 'Elemental';
}

async function run() {
  await connectDatabase();

  const brand = await Brand.findOne({ slug: 'tsar-bomba' });
  const category = await Category.findOne();
  if (!brand || !category) throw new Error('Run `npm run seed` first — no brand or category found.');

  // `seed.ts` builds its slugs as brand-name-reference unconditionally, which stutters
  // for the listings tsarbomba.com names after the model number itself
  // ("tsar-bomba-elemental-tb8208a-tb8208a"). Normalising here keeps the URLs the same
  // whichever path a product came in through.
  let renamed = 0;
  for (const product of await Watch.find({}, { name: 1, reference: 1, slug: 1, type: 1 })) {
    const wanted = slugFor(brand.name, product.name, product.reference, product.type);
    if (wanted === product.slug || (await Watch.exists({ slug: wanted }))) continue;
    await Watch.updateOne({ _id: product._id }, { slug: wanted });
    renamed += 1;
  }
  if (renamed) console.log(`[import] slug tozalandi: ${renamed} ta`);

  const file = path.join(__dirname, 'tsarbomba-import.json');
  const entries: ImportEntry[] = JSON.parse(fs.readFileSync(file, 'utf8'));

  let inserted = 0;
  let insertedAccessories = 0;
  let skipped = 0;
  for (const entry of entries) {
    const name = entry.title;
    // Watches are addressed brand-name-reference ("tsar-bomba-dark-matter-4-tb8604"),
    // but tsarbomba.com names most of its listings after the model number itself, and
    // an accessory has no model number at all (the fetcher derives one from the title).
    // In both cases appending the reference stutters — "…-tb8228a-tb8228a",
    // "…-cubic-zirconia-bezel-cubic-zirconia-bezel" — so it is appended only when the
    // name does not already end with it.
    const slug = slugFor(brand.name, name, entry.reference, entry.type);
    if (await Watch.exists({ slug })) {
      skipped += 1;
      continue;
    }

    const usedSlugs = new Set<string>();
    const variants = entry.variants.map((variant, index) => {
      let colorSlug = toSlug(variant.colorLabel || 'default') || 'default';
      while (usedSlugs.has(colorSlug)) colorSlug = `${colorSlug}-${index + 1}`;
      usedSlugs.add(colorSlug);
      return {
        colorSlug,
        colorLabel: variant.colorLabel,
        colorLabelRu: translateColor(variant.colorLabel, COLOR_RU),
        colorLabelUz: translateColor(variant.colorLabel, COLOR_UZ),
        images: variant.images,
        videos: [],
      };
    });

    const copy = buildCopy(entry, variants.length);
    await Watch.create({
      brand: brand._id,
      category: category._id,
      name,
      slug,
      reference: entry.reference,
      price: entry.price,
      currency: 'USD',
      type: entry.type,
      gender: entry.women ? 'women' : 'men',
      variants,
      description: copy.description,
      shortDescription: copy.shortDescription,
      movement: entry.movement ? MOVEMENT[entry.movement][0] : '',
      caseMaterial: entry.material ? MATERIAL[entry.material][0] : '',
      // tsarbomba.com publishes no spec sheet for these; left for an editor to fill in.
      caseSize: '',
      dial: '',
      bracelet: '',
      waterResistance: '',
      availability: 'in-stock',
      featured: false,
      isNewArrival: true,
      isActive: true,
      translations: {
        ru: { name, description: copy.descriptionRu, shortDescription: copy.shortDescriptionRu },
        uz: { name, description: copy.descriptionUz, shortDescription: copy.shortDescriptionUz },
      },
    });
    inserted += 1;
    if (entry.type === 'accessory') insertedAccessories += 1;
  }
  console.log(
    `[import] +${inserted - insertedAccessories} soat, +${insertedAccessories} aksessuar qo'shildi, ${skipped} allaqachon bor edi`,
  );

  // Every watch — hand-seeded or imported — gets its audience and series from the brand's
  // own grouping, then the nine collections are rebuilt around that.
  const watches = await Watch.find({ type: { $ne: 'accessory' } });
  const bySeries = new Map<string, mongoose.Types.ObjectId[]>();
  const byGender: Record<Gender, mongoose.Types.ObjectId[]> = { men: [], women: [] };
  for (const watch of watches) {
    const series = seriesOf(watch.name);
    const gender: Gender =
      series === 'Nucleus Femme' || WOMEN_REFERENCES.has(watch.reference) || /\(women\)|（women/i.test(watch.name)
        ? 'women'
        : 'men';
    // Written unconditionally: a document seeded before `gender` existed reads back
    // with the schema default already applied, so comparing against it would decide
    // nothing had changed and the field would never reach the database.
    byGender[gender].push(watch._id as mongoose.Types.ObjectId);
    if (!bySeries.has(series)) bySeries.set(series, []);
    bySeries.get(series)!.push(watch._id as mongoose.Types.ObjectId);
  }
  for (const gender of ['men', 'women'] as Gender[]) {
    await Watch.updateMany({ _id: { $in: byGender[gender] } }, { gender });
  }
  console.log(`[import] gender: ${byGender.men.length} erkaklar, ${byGender.women.length} ayollar`);

  // The old `heritage-icons` / `new-arrivals` pair were invented for the demo seed and
  // carried generated SVG placeholders as cover art; the real series replace them.
  await Collection.deleteMany({ slug: { $in: ['heritage-icons', 'new-arrivals'] } });

  for (const series of SERIES) {
    const slug = toSlug(series.name);
    const ids = bySeries.get(series.name) ?? [];
    // Cover art is the lead photo of the collection's first watch — a real product
    // shot rather than the generated placeholder the demo collections used.
    const lead = ids.length ? await Watch.findById(ids[0]) : null;
    const image = lead?.variants?.[0]?.images?.[0] ?? '';

    await Collection.findOneAndUpdate(
      { slug },
      {
        name: series.name,
        slug,
        description: series.description,
        image,
        gender: series.gender,
        watches: ids,
        featured: ids.length > 0,
        isActive: ids.length > 0,
        translations: {
          ru: { name: series.nameRu, description: series.descriptionRu },
          uz: { name: series.nameUz, description: series.descriptionUz },
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    // A watch's `collectionRef` drives the "part of" line on its product page.
    const collection = await Collection.findOne({ slug });
    if (collection && ids.length) {
      await Watch.updateMany({ _id: { $in: ids } }, { collectionRef: collection._id });
    }

    // An accessory named for a series ("Reactor Interchangeable Strap") points at that
    // collection too, so filtering the catalogue by collection finds the parts that go
    // with it — but it stays out of the collection's own `watches` list, which the
    // collection page renders as timepieces.
    if (collection) {
      const escaped = series.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      await Watch.updateMany(
        { type: 'accessory', name: new RegExp(escaped, 'i') },
        { collectionRef: collection._id },
      );
    }
    console.log(`[import] ${series.gender === 'women' ? 'AYOL ' : 'erkak'} ${series.name.padEnd(14)} ${ids.length} soat`);
  }

  const accessories = await Watch.countDocuments({ type: 'accessory' });
  console.log(`[import] aksessuarlar: ${accessories} ta`);

  await mongoose.disconnect();
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
