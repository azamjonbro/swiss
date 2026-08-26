import mongoose from 'mongoose';
import { connectDatabase } from '../config/db';
import { toSlug } from '../utils/slug';
import { watchPlaceholder, watchProductPlaceholder, categoryPlaceholder } from '../utils/placeholder';
import { Admin } from '../models/Admin';
import { Brand } from '../models/Brand';
import { Category } from '../models/Category';
import { Watch } from '../models/Watch';
import { Collection } from '../models/Collection';

function img(seed: string, label = '') {
  return watchPlaceholder(seed, label);
}

export const BRANDS = [
  {
    name: 'Rolex',
    tagline: 'A crown for every achievement.',
    description:
      'Founded in 1905, Rolex has built its reputation on precision, robustness, and understated prestige — the benchmark by which all modern sports watches are measured.',
    taglineRu: 'Корона для каждого достижения.',
    descriptionRu:
      'Основанный в 1905 году, Rolex построил свою репутацию на точности, надёжности и сдержанном престиже — эталоне, по которому оценивают все современные спортивные часы.',
    taglineUz: "Har bir yutuq uchun toj.",
    descriptionUz:
      "1905-yilda tashkil topgan Rolex o'zining obro'sini aniqlik, mustahkamlik va nafis obro'-e'tibor asosida qurgan — bu barcha zamonaviy sport soatlari baholanadigan andozadir.",
    founded: 1905,
  },
  {
    name: 'Patek Philippe',
    tagline: 'You never actually own a Patek Philippe.',
    description:
      'Since 1839, Patek Philippe has remained one of the last independent, family-owned Genevan manufactures, revered for haute horlogerie and multigenerational craftsmanship.',
    taglineRu: 'Вы никогда по-настоящему не владеете Patek Philippe.',
    descriptionRu:
      'С 1839 года Patek Philippe остаётся одной из последних независимых, семейных женевских мануфактур, почитаемой за высокое часовое искусство и мастерство, передаваемое из поколения в поколение.',
    taglineUz: "Siz hech qachon Patek Philippe'ga haqiqiy egalik qilmaysiz.",
    descriptionUz:
      "1839-yildan beri Patek Philippe Jenevaning mustaqil, oilaviy manufakturalaridan biri bo'lib qolmoqda — yuqori soatsozlik san'ati va avloddan-avlodga o'tuvchi ustalik bilan e'zozlanadi.",
    founded: 1839,
  },
  {
    name: 'Audemars Piguet',
    tagline: 'To break the rules, you must first master them.',
    description:
      'Established in the Vallée de Joux in 1875, Audemars Piguet redefined luxury sports watchmaking with the octagonal Royal Oak in 1972.',
    taglineRu: 'Чтобы нарушать правила, нужно сначала овладеть ими в совершенстве.',
    descriptionRu:
      'Основанная в долине Валле-де-Жу в 1875 году, Audemars Piguet переопределила люксовое спортивное часовое искусство благодаря восьмиугольной модели Royal Oak в 1972 году.',
    taglineUz: 'Qoidalarni buzish uchun avval ularni mukammal egallash kerak.',
    descriptionUz:
      '1875-yilda Vallée de Joux vodiysida tashkil topgan Audemars Piguet 1972-yilda sakkiz qirrali Royal Oak modeli bilan lyuks sport soatlari sanoatini qayta belgiladi.',
    founded: 1875,
  },
  {
    name: 'Vacheron Constantin',
    tagline: 'Tradition. Precision. Eternity.',
    description:
      'The oldest watch manufacture in continuous operation since 1755, Vacheron Constantin embodies uninterrupted Genevan craftsmanship across three centuries.',
    taglineRu: 'Традиция. Точность. Вечность.',
    descriptionRu:
      'Старейшая часовая мануфактура, непрерывно работающая с 1755 года, Vacheron Constantin воплощает непрерывное женевское мастерство на протяжении трёх столетий.',
    taglineUz: 'An\'ana. Aniqlik. Abadiylik.',
    descriptionUz:
      "1755-yildan beri uzluksiz faoliyat yuritayotgan eng qadimiy soat manufakturasi Vacheron Constantin uch asr davomida Jeneva ustalik an'analarini davom ettirmoqda.",
    founded: 1755,
  },
  {
    name: 'Cartier',
    tagline: 'The jeweler of kings, the king of jewelers.',
    description:
      'Since 1847, Cartier has shaped the history of watchmaking with architectural cases and unmistakable elegance, from the Santos to the Tank.',
    taglineRu: 'Ювелир королей, король ювелиров.',
    descriptionRu:
      'С 1847 года Cartier формирует историю часового искусства благодаря архитектурным корпусам и безошибочно узнаваемой элегантности — от Santos до Tank.',
    taglineUz: 'Qirollarning zargari, zargarlarning qiroli.',
    descriptionUz:
      "1847-yildan beri Cartier arxitektura uslubidagi korpuslar va o'ziga xos nafislik bilan soatsozlik tarixini shakllantirib kelmoqda — Santos'dan Tank'gacha.",
    founded: 1847,
  },
  {
    name: 'Omega',
    tagline: 'Precision that reaches the moon.',
    description:
      'Trusted since 1848 and worn on the surface of the moon, Omega pairs rigorous chronometry with a legacy of exploration.',
    taglineRu: 'Точность, достигающая Луны.',
    descriptionRu:
      'Заслужившая доверие с 1848 года и побывавшая на поверхности Луны, Omega сочетает строгую хронометрию с наследием исследований.',
    taglineUz: "Oygacha yetib boradigan aniqlik.",
    descriptionUz:
      "1848-yildan ishonchni qozongan va Oy yuzasida kiyilgan Omega qat'iy xronometriyani kashfiyot merosi bilan uyg'unlashtiradi.",
    founded: 1848,
  },
  {
    name: 'Richard Mille',
    tagline: 'A racing machine on the wrist.',
    description:
      'Since 2001, Richard Mille has fused motorsport engineering with haute horlogerie, producing some of the most technically radical timepieces in the world.',
    taglineRu: 'Гоночная машина на запястье.',
    descriptionRu:
      'С 2001 года Richard Mille соединяет инженерию автоспорта с высоким часовым искусством, создавая одни из самых технически радикальных часов в мире.',
    taglineUz: 'Bilakdagi poyga mashinasi.',
    descriptionUz:
      "2001-yildan beri Richard Mille avtosport muhandisligini yuqori soatsozlik san'ati bilan birlashtirib, dunyodagi eng texnik jihatdan radikal soatlarini yaratmoqda.",
    founded: 2001,
  },
  {
    name: 'Tsar Bomba',
    tagline: 'Bold, innovative, and unapologetic.',
    description:
      'Tsar Bomba pushes the boundaries of modern watchmaking with striking mechanical designs and futuristic aesthetics that command attention.',
    taglineRu: 'Смелый, инновационный и бескомпромиссный.',
    descriptionRu:
      'Tsar Bomba раздвигает границы современного часового искусства благодаря ярким механическим конструкциям и футуристической эстетике, приковывающей взгляды.',
    taglineUz: 'Jasur, innovatsion va murosasiz.',
    descriptionUz:
      "Tsar Bomba diqqatni tortadigan hayratlanarli mexanik dizaynlar va futuristik estetika bilan zamonaviy soatsozlik chegaralarini kengaytiradi.",
    founded: 2021,
  },
];

// One product can ship in several colourways — real, distinct photography per
// colour, not a re-tint. Every WatchColorVariant below becomes one entry in
// the *same* product's `variants[]` array (not a separate Watch document),
// so the storefront can switch colours in place on one product page.
interface WatchColorVariant {
  // Retained only so the many existing variant literals below don't need to
  // be touched one-by-one; no longer read when building documents.
  refSuffix?: string;
  colorLabel: string;
  colorLabelRu: string;
  colorLabelUz: string;
  images: string[];
  videos?: string[];
}

interface WatchSeedEntry {
  brand: string;
  name: string;
  reference: string;
  image?: string;
  images?: string[];
  videos?: string[];
  // Label for the entry's own (primary) images/videos above, when this
  // product also has additional colour variants below — keeps the primary
  // variant distinct from its siblings in the color selector.
  colorLabel?: string;
  colorLabelRu?: string;
  colorLabelUz?: string;
  variants?: WatchColorVariant[];
  price: number;
  movement: string;
  caseMaterial: string;
  caseSize: string;
  dial: string;
  bracelet: string;
  waterResistance: string;
  shortDescription: string;
  shortDescriptionRu: string;
  shortDescriptionUz: string;
  description?: string;
  descriptionRu: string;
  descriptionUz: string;
  featured: boolean;
  isNew: boolean;
  availability?: 'in-stock' | 'reserved' | 'sold' | 'made-to-order';
  // Accessories only — marks the entry as a "pair it with" product rather
  // than a watch, and the model references (WatchSeedEntry.reference) it fits.
  type?: 'watch' | 'accessory';
  compatibleWithRefs?: string[];
  // Curated cross-links for "you may also like", by model reference.
  relatedRefs?: string[];
}

// Prices sourced from tsarbomba.com (en-sg storefront) are listed in SGD.
// Converted to USD at a fixed rate of 0.74 (SGD * 0.74) so every price in
// this schema stays a plain USD number — not an invented figure, just a
// currency conversion of the real listed price.
export const WATCHES: WatchSeedEntry[] = [
  {
    brand: 'Rolex',
    name: 'Submariner Date',
    reference: '126610LN',
    price: 10800,
    movement: 'Automatic, Calibre 3235',
    caseMaterial: 'Oystersteel',
    caseSize: '41mm',
    dial: 'Black',
    bracelet: 'Oyster, Oystersteel',
    waterResistance: '300m',
    shortDescription: 'The reference dive watch, engineered for depth and refined for the boardroom.',
    shortDescriptionRu: 'Эталонные часы для дайвинга, созданные для глубины и утончённые для зала заседаний.',
    shortDescriptionUz:
      "Chuqurlik uchun yaratilgan va boshqaruv kengashi uchun mukammallashtirilgan andoza sho'ng'in soati.",
    descriptionRu:
      'Эталонные часы для дайвинга, созданные для глубины и утончённые для зала заседаний. Оснащены автоматическим механизмом Calibre 3235, заключены в корпус 41 мм из стали Oystersteel и дополнены чёрным циферблатом.',
    descriptionUz:
      "Chuqurlik uchun yaratilgan va boshqaruv kengashi uchun mukammallashtirilgan andoza sho'ng'in soati. Avtomatik Calibre 3235 mexanizmi bilan jihozlangan, 41mm o'lchamdagi Oystersteel korpusda joylashgan va qora sirtqi taxta bilan yakunlangan.",
    featured: true,
    isNew: true,
  },
  {
    brand: 'Rolex',
    name: 'Daytona',
    reference: '126500LN',
    price: 15500,
    movement: 'Automatic Chronograph, Calibre 4131',
    caseMaterial: 'Oystersteel',
    caseSize: '40mm',
    dial: 'Black',
    bracelet: 'Oyster, Oystersteel',
    waterResistance: '100m',
    shortDescription: 'Born on the racetrack, perfected over six decades of motorsport heritage.',
    shortDescriptionRu:
      'Рождённые на гоночной трассе, доведённые до совершенства за шесть десятилетий автоспортивного наследия.',
    shortDescriptionUz: "Poyga trekida tug'ilgan, olti o'n yillik avtosport merosi davomida mukammallashtirilgan.",
    descriptionRu:
      'Рождённые на гоночной трассе, доведённые до совершенства за шесть десятилетий автоспортивного наследия. Оснащены автоматическим хронографом Calibre 4131, заключены в корпус 40 мм из стали Oystersteel и дополнены чёрным циферблатом.',
    descriptionUz:
      "Poyga trekida tug'ilgan, olti o'n yillik avtosport merosi davomida mukammallashtirilgan. Avtomatik Calibre 4131 xronograf mexanizmi bilan jihozlangan, 40mm o'lchamdagi Oystersteel korpusda joylashgan va qora sirtqi taxta bilan yakunlangan.",
    featured: true,
    isNew: false,
  },
  {
    brand: 'Patek Philippe',
    name: 'Nautilus 5711',
    reference: '5711/1A-010',
    price: 135000,
    movement: 'Automatic, Calibre 26-330 S C',
    caseMaterial: 'Stainless Steel',
    caseSize: '40mm',
    dial: 'Blue, embossed horizontal',
    bracelet: 'Integrated steel',
    waterResistance: '120m',
    shortDescription: 'The porthole silhouette that redefined the steel sports watch category.',
    shortDescriptionRu: 'Силуэт иллюминатора, переопределивший категорию стальных спортивных часов.',
    shortDescriptionUz: "Po'lat sport soatlari toifasini qayta belgilagan illyuminator siluetli model.",
    descriptionRu:
      'Силуэт иллюминатора, переопределивший категорию стальных спортивных часов. Оснащены автоматическим механизмом Calibre 26-330 S C, заключены в корпус 40 мм из нержавеющей стали и дополнены синим рельефным горизонтальным циферблатом.',
    descriptionUz:
      "Po'lat sport soatlari toifasini qayta belgilagan illyuminator siluetli model. Avtomatik Calibre 26-330 S C mexanizmi bilan jihozlangan, 40mm o'lchamdagi zanglamas po'lat korpusda joylashgan va ko'k gorizontal relyefli sirtqi taxta bilan yakunlangan.",
    featured: true,
    isNew: false,
  },
  {
    brand: 'Patek Philippe',
    name: 'Calatrava',
    reference: '6119R-001',
    price: 32000,
    movement: 'Manual winding, Calibre 30-255 PS',
    caseMaterial: '18k Rose Gold',
    caseSize: '39mm',
    dial: 'Ivory lacquered',
    bracelet: 'Shiny brown alligator strap',
    waterResistance: '30m',
    shortDescription: 'The purest expression of round watchmaking, unchanged in spirit since 1932.',
    shortDescriptionRu: 'Самое чистое выражение круглого часового искусства, неизменное по духу с 1932 года.',
    shortDescriptionUz: "1932-yildan beri ruhi o'zgarmagan, dumaloq soatsozlikning eng sof ifodasi.",
    descriptionRu:
      'Самое чистое выражение круглого часового искусства, неизменное по духу с 1932 года. Оснащены механизмом ручного завода Calibre 30-255 PS, заключены в корпус 39 мм из 18-каратного розового золота и дополнены циферблатом цвета слоновой кости.',
    descriptionUz:
      "1932-yildan beri ruhi o'zgarmagan, dumaloq soatsozlikning eng sof ifodasi. Qo'lda zavod Calibre 30-255 PS mexanizmi bilan jihozlangan, 39mm o'lchamdagi 18 karatli pushti oltin korpusda joylashgan va fil suyagi rangli lakli sirtqi taxta bilan yakunlangan.",
    featured: false,
    isNew: false,
  },
  {
    brand: 'Audemars Piguet',
    name: 'Royal Oak',
    reference: '15500ST.OO.1220ST.01',
    price: 42000,
    movement: 'Automatic, Calibre 4302',
    caseMaterial: 'Stainless Steel',
    caseSize: '41mm',
    dial: 'Blue Grande Tapisserie',
    bracelet: 'Integrated steel',
    waterResistance: '50m',
    shortDescription: 'The octagonal icon that made steel more coveted than gold.',
    shortDescriptionRu: 'Восьмиугольная икона, сделавшая сталь желаннее золота.',
    shortDescriptionUz: "Po'latni oltindan ham qadrliroq qilgan sakkiz qirrali ikonik model.",
    descriptionRu:
      'Восьмиугольная икона, сделавшая сталь желаннее золота. Оснащены автоматическим механизмом Calibre 4302, заключены в корпус 41 мм из нержавеющей стали и дополнены синим циферблатом Grande Tapisserie.',
    descriptionUz:
      "Po'latni oltindan ham qadrliroq qilgan sakkiz qirrali ikonik model. Avtomatik Calibre 4302 mexanizmi bilan jihozlangan, 41mm o'lchamdagi zanglamas po'lat korpusda joylashgan va ko'k Grande Tapisserie sirtqi taxta bilan yakunlangan.",
    featured: true,
    isNew: true,
  },
  {
    brand: 'Audemars Piguet',
    name: 'Royal Oak Offshore',
    reference: '26420CE.OO.A002CA.01',
    price: 58000,
    movement: 'Automatic Chronograph, Calibre 4404',
    caseMaterial: 'Black Ceramic',
    caseSize: '43mm',
    dial: 'Black smoked',
    bracelet: 'Black rubber strap',
    waterResistance: '100m',
    shortDescription: 'Bold, technical, and unapologetically oversized — the Beast reimagined.',
    shortDescriptionRu: 'Смелые, технологичные и намеренно крупные — переосмысленный «Зверь».',
    shortDescriptionUz: "Jasur, texnik va ataylab yirik o'lchamli — qayta talqin qilingan \"Yirtqich\".",
    descriptionRu:
      'Смелые, технологичные и намеренно крупные — переосмысленный «Зверь». Оснащены автоматическим хронографом Calibre 4404, заключены в корпус 43 мм из чёрной керамики и дополнены дымчатым чёрным циферблатом.',
    descriptionUz:
      "Jasur, texnik va ataylab yirik o'lchamli — qayta talqin qilingan \"Yirtqich\". Avtomatik Calibre 4404 xronograf mexanizmi bilan jihozlangan, 43mm o'lchamdagi qora keramika korpusda joylashgan va tutunsimon qora sirtqi taxta bilan yakunlangan.",
    featured: false,
    isNew: false,
  },
  {
    brand: 'Vacheron Constantin',
    name: 'Overseas',
    reference: '4500V/110A-B128',
    price: 24500,
    movement: 'Automatic, Calibre 5100',
    caseMaterial: 'Stainless Steel',
    caseSize: '41mm',
    dial: 'Blue toile de Jouy',
    bracelet: 'Interchangeable steel bracelet',
    waterResistance: '150m',
    shortDescription: 'Genevan precision built for a life in motion, with a toolless strap system.',
    shortDescriptionRu:
      'Женевская точность, созданная для активной жизни, с системой смены ремешка без инструментов.',
    shortDescriptionUz:
      "Asboblarsiz almashtiriladigan tasma tizimiga ega, harakatdagi hayot uchun yaratilgan Jeneva aniqligi.",
    descriptionRu:
      'Женевская точность, созданная для активной жизни, с системой смены ремешка без инструментов. Оснащены автоматическим механизмом Calibre 5100, заключены в корпус 41 мм из нержавеющей стали и дополнены синим циферблатом toile de Jouy.',
    descriptionUz:
      "Asboblarsiz almashtiriladigan tasma tizimiga ega, harakatdagi hayot uchun yaratilgan Jeneva aniqligi. Avtomatik Calibre 5100 mexanizmi bilan jihozlangan, 41mm o'lchamdagi zanglamas po'lat korpusda joylashgan va ko'k toile de Jouy sirtqi taxta bilan yakunlangan.",
    featured: false,
    isNew: true,
  },
  {
    brand: 'Vacheron Constantin',
    name: 'Patrimony',
    reference: '85180/000R-9248',
    price: 29000,
    movement: 'Manual winding, Calibre 1400 AS',
    caseMaterial: '18k Pink Gold',
    caseSize: '40mm',
    dial: 'Silver opaline',
    bracelet: 'Navy blue alligator strap',
    waterResistance: '30m',
    shortDescription: 'Understated dress watchmaking distilled to its essential elegance.',
    shortDescriptionRu: 'Сдержанное классическое часовое искусство, доведённое до истинной элегантности.',
    shortDescriptionUz: "Mukammal nafislikkacha soddalashtirilgan, sokin klassik soatsozlik.",
    descriptionRu:
      'Сдержанное классическое часовое искусство, доведённое до истинной элегантности. Оснащены механизмом ручного завода Calibre 1400 AS, заключены в корпус 40 мм из 18-каратного розового золота и дополнены серебристым опалиновым циферблатом.',
    descriptionUz:
      "Mukammal nafislikkacha soddalashtirilgan, sokin klassik soatsozlik. Qo'lda zavod Calibre 1400 AS mexanizmi bilan jihozlangan, 40mm o'lchamdagi 18 karatli pushti oltin korpusda joylashgan va kumushrang opalin sirtqi taxta bilan yakunlangan.",
    featured: false,
    isNew: false,
  },
  {
    brand: 'Cartier',
    name: 'Santos de Cartier',
    reference: 'WSSA0018',
    price: 9300,
    movement: 'Automatic, Calibre 1847 MC',
    caseMaterial: 'Steel and 18k Yellow Gold',
    caseSize: '39.8mm',
    dial: 'Silvered opaline',
    bracelet: 'QuickSwitch steel and gold bracelet',
    waterResistance: '100m',
    shortDescription: 'The first wristwatch made for aviation, still architecturally unmistakable.',
    shortDescriptionRu:
      'Первые наручные часы, созданные для авиации, до сих пор безошибочно узнаваемые по своей архитектуре.',
    shortDescriptionUz:
      "Aviatsiya uchun yaratilgan birinchi qo'l soati, hozirgacha o'ziga xos arxitekturasi bilan ajralib turadi.",
    descriptionRu:
      'Первые наручные часы, созданные для авиации, до сих пор безошибочно узнаваемые по своей архитектуре. Оснащены автоматическим механизмом Calibre 1847 MC, заключены в корпус 39,8 мм из стали и 18-каратного жёлтого золота и дополнены серебристым опалиновым циферблатом.',
    descriptionUz:
      "Aviatsiya uchun yaratilgan birinchi qo'l soati, hozirgacha o'ziga xos arxitekturasi bilan ajralib turadi. Avtomatik Calibre 1847 MC mexanizmi bilan jihozlangan, 39.8mm o'lchamdagi po'lat va 18 karatli sariq oltin korpusda joylashgan va kumushrang opalin sirtqi taxta bilan yakunlangan.",
    featured: true,
    isNew: false,
  },
  {
    brand: 'Cartier',
    name: 'Tank Louis Cartier',
    reference: 'WGTA0011',
    price: 16900,
    movement: 'Manual winding, Calibre 1917 MC',
    caseMaterial: '18k Yellow Gold',
    caseSize: '33.7mm',
    dial: 'Silvered opaline',
    bracelet: 'Alligator strap',
    waterResistance: '30m',
    shortDescription: 'A rectangular icon born in 1917, still the definition of quiet elegance.',
    shortDescriptionRu:
      'Прямоугольная икона, рождённая в 1917 году, по-прежнему олицетворяющая тихую элегантность.',
    shortDescriptionUz: "1917-yilda dunyoga kelgan to'rtburchak ikonik model, hanuzgacha sokin nafislik timsoli.",
    descriptionRu:
      'Прямоугольная икона, рождённая в 1917 году, по-прежнему олицетворяющая тихую элегантность. Оснащены механизмом ручного завода Calibre 1917 MC, заключены в корпус 33,7 мм из 18-каратного жёлтого золота и дополнены серебристым опалиновым циферблатом.',
    descriptionUz:
      "1917-yilda dunyoga kelgan to'rtburchak ikonik model, hanuzgacha sokin nafislik timsoli. Qo'lda zavod Calibre 1917 MC mexanizmi bilan jihozlangan, 33.7mm o'lchamdagi 18 karatli sariq oltin korpusda joylashgan va kumushrang opalin sirtqi taxta bilan yakunlangan.",
    featured: false,
    isNew: false,
  },
  {
    brand: 'Omega',
    name: 'Speedmaster Moonwatch Professional',
    reference: '310.30.42.50.01.001',
    price: 7400,
    movement: 'Manual winding Chronograph, Calibre 3861',
    caseMaterial: 'Stainless Steel',
    caseSize: '42mm',
    dial: 'Black',
    bracelet: 'Steel bracelet',
    waterResistance: '50m',
    shortDescription: 'The first watch worn on the moon, unchanged in spirit since Apollo 11.',
    shortDescriptionRu: 'Первые часы, побывавшие на Луне, неизменные по духу со времён Apollo 11.',
    shortDescriptionUz: "Oyda kiyilgan birinchi soat, Apollo 11 davridan beri ruhi o'zgarmagan.",
    descriptionRu:
      'Первые часы, побывавшие на Луне, неизменные по духу со времён Apollo 11. Оснащены хронографом ручного завода Calibre 3861, заключены в корпус 42 мм из нержавеющей стали и дополнены чёрным циферблатом.',
    descriptionUz:
      "Oyda kiyilgan birinchi soat, Apollo 11 davridan beri ruhi o'zgarmagan. Qo'lda zavod Calibre 3861 xronograf mexanizmi bilan jihozlangan, 42mm o'lchamdagi zanglamas po'lat korpusda joylashgan va qora sirtqi taxta bilan yakunlangan.",
    featured: false,
    isNew: true,
  },
  {
    brand: 'Omega',
    name: 'Seamaster Diver 300M',
    reference: '210.30.42.20.03.001',
    price: 6300,
    movement: 'Automatic, Co-Axial Master Chronometer',
    caseMaterial: 'Stainless Steel',
    caseSize: '42mm',
    dial: 'Summer Blue',
    bracelet: 'Steel bracelet',
    waterResistance: '300m',
    shortDescription: 'A diver refined for the surface, engineered for the depths.',
    shortDescriptionRu: 'Дайверские часы, утончённые для поверхности и созданные для глубин.',
    shortDescriptionUz: "Sirt uchun mukammallashtirilgan, chuqurlik uchun yaratilgan sho'ng'in soati.",
    descriptionRu:
      'Дайверские часы, утончённые для поверхности и созданные для глубин. Оснащены автоматическим механизмом Co-Axial Master Chronometer, заключены в корпус 42 мм из нержавеющей стали и дополнены циферблатом Summer Blue.',
    descriptionUz:
      "Sirt uchun mukammallashtirilgan, chuqurlik uchun yaratilgan sho'ng'in soati. Avtomatik Co-Axial Master Chronometer mexanizmi bilan jihozlangan, 42mm o'lchamdagi zanglamas po'lat korpusda joylashgan va Summer Blue sirtqi taxta bilan yakunlangan.",
    featured: false,
    isNew: false,
  },
  {
    brand: 'Richard Mille',
    name: 'RM 011',
    reference: 'RM 011 FM',
    price: 220000,
    movement: 'Automatic Flyback Chronograph',
    caseMaterial: 'Carbon TPT',
    caseSize: '50mm',
    dial: 'Openworked skeleton',
    bracelet: 'Black rubber strap',
    waterResistance: '50m',
    shortDescription: 'A racing machine engineered for the wrist, built without compromise.',
    shortDescriptionRu: 'Гоночная машина, созданная для запястья, без единого компромисса.',
    shortDescriptionUz: "Bilak uchun yaratilgan, hech qanday murosasiz ishlab chiqilgan poyga mashinasi.",
    descriptionRu:
      'Гоночная машина, созданная для запястья, без единого компромисса. Оснащены автоматическим хронографом с функцией flyback, заключены в корпус 50 мм из карбона Carbon TPT и дополнены скелетонированным ажурным циферблатом.',
    descriptionUz:
      "Bilak uchun yaratilgan, hech qanday murosasiz ishlab chiqilgan poyga mashinasi. Avtomatik flyback xronograf mexanizmi bilan jihozlangan, 50mm o'lchamdagi Carbon TPT korpusda joylashgan va oyna kabi skelet sirtqi taxta bilan yakunlangan.",
    featured: true,
    isNew: false,
  },
  {
    brand: 'Tsar Bomba',
    name: 'TB8208',
    reference: 'TB8208CF',
    relatedRefs: ['TB8204Q', 'TB8216', 'TB8213'],
    images: [
      '/uploads/images/tsarbomba_tb8208_1.jpg',
      '/uploads/images/tsarbomba_tb8208_2.jpg',
      '/uploads/images/tsarbomba_tb8208_3.jpg',
    ],
    videos: ['/uploads/videos/tsarbomba_tb8208.mp4'],
    colorLabel: 'White',
    colorLabelRu: 'Белый',
    colorLabelUz: 'Oq',
    variants: [
      {
        refSuffix: '07',
        colorLabel: 'Red',
        colorLabelRu: 'Красный',
        colorLabelUz: 'Qizil',
        images: ['/uploads/images/tsarbomba_tb8208_red_1.jpg', '/uploads/images/tsarbomba_tb8208_red_2.jpg'],
        videos: ['/uploads/videos/tsarbomba_tb8208_red.mp4'],
      },
      {
        refSuffix: '11',
        colorLabel: 'Black / Blue',
        colorLabelRu: 'Чёрный / синий',
        colorLabelUz: "Qora / ko'k",
        images: ['/uploads/images/tsarbomba_tb8208_black_blue_1.jpg', '/uploads/images/tsarbomba_tb8208_black_blue_2.jpg'],
        videos: ['/uploads/videos/tsarbomba_tb8208_black_blue.mp4'],
      },
    ],
    price: 499.99,
    movement: 'Miyota, Automatic',
    caseMaterial: 'Stainless Steel 316L, Carbon Fiber Bezel',
    caseSize: '43 × 50.5 × 15.5mm',
    dial: 'Open-heart skeletonized',
    bracelet: 'Silicone strap, quick-release, 26mm',
    waterResistance: '5 ATM / 50m',
    shortDescription: 'A striking tonneau-shaped automatic skeleton watch with a carbon-fiber bezel and open-heart dial.',
    shortDescriptionRu:
      'Эффектные автоматические скелетон-часы бочкообразной формы с безелем из углеродного волокна и открытым циферблатом.',
    shortDescriptionUz:
      "Uglerod tolali bezel va ochiq skelet sirtqi taxtaga ega, bochkasimon shakldagi ta'sirchan avtomatik soat.",
    descriptionRu:
      'Смелая, трёхмерная, многослойная форма идеально сочетает механику и эстетику. Корпус имеет чёткие линии и ясные грани, отражая холодное визуальное напряжение, подобное городской кибер-архитектуре. Оснащены автоматическим механизмом Miyota, заключены в корпус 43 × 50,5 × 15,5 мм из нержавеющей стали 316L с безелем из углеродного волокна и дополнены скелетонированным циферблатом с открытым сердцем механизма.',
    descriptionUz:
      "Jasur, uch o'lchamli, ko'p qatlamli shakl mexanika va estetikani mukammal uyg'unlashtiradi. Korpus aniq chiziqlar va tiniq qirralarga ega bo'lib, shahar kiber-arxitekturasiga xos sovuq vizual tarangligini aks ettiradi. Avtomatik Miyota mexanizmi bilan jihozlangan, 43 × 50.5 × 15.5mm o'lchamdagi uglerod tolali bezelli zanglamas po'lat 316L korpusda joylashgan va mexanizm yuragi ochiq skelet sirtqi taxta bilan yakunlangan.",
    featured: true,
    isNew: false,
    availability: 'in-stock',
  },
  {
    brand: 'Tsar Bomba',
    name: 'TB8204',
    reference: 'TB8204Q',
    relatedRefs: ['TB8208CF', 'TB8216', 'TB8229'],
    images: [
      '/uploads/images/tsarbomba_tb8204_1.jpg',
      '/uploads/images/tsarbomba_tb8204_2.jpg',
      '/uploads/images/tsarbomba_tb8204_3.jpg',
    ],
    videos: ['/uploads/videos/tsarbomba_tb8204.mp4'],
    colorLabel: 'Black / Red',
    colorLabelRu: 'Чёрный / красный',
    colorLabelUz: 'Qora / qizil',
    variants: [
      {
        refSuffix: '05',
        colorLabel: 'Gold / Blue',
        colorLabelRu: 'Золотой / синий',
        colorLabelUz: "Oltin / ko'k",
        images: ['/uploads/images/tsarbomba_tb8204_gold_blue_1.jpg', '/uploads/images/tsarbomba_tb8204_gold_blue_2.jpg'],
        videos: ['/uploads/videos/tsarbomba_tb8204_gold_blue.mp4'],
      },
      {
        refSuffix: '11',
        colorLabel: 'Silver / Orange',
        colorLabelRu: 'Серебристый / оранжевый',
        colorLabelUz: "Kumush / to'q sariq",
        images: ['/uploads/images/tsarbomba_tb8204_silver_orange_1.jpg', '/uploads/images/tsarbomba_tb8204_silver_orange_2.jpg'],
        videos: ['/uploads/videos/tsarbomba_tb8204_silver_orange.mp4'],
      },
    ],
    price: 219.99,
    movement: 'Seiko, Quartz Chronograph',
    caseMaterial: 'Stainless Steel 316L',
    caseSize: '43 × 50.5 × 15.5mm',
    dial: 'Black and red skeletonized, three-eye chronograph',
    bracelet: 'Silicone strap, 26mm',
    waterResistance: '5 ATM / 50m',
    shortDescription: 'A bold chronograph pairing modern sport styling with a striking black-and-red skeletonized dial.',
    shortDescriptionRu:
      'Смелый хронограф, сочетающий современный спортивный стиль с эффектным чёрно-красным скелетонированным циферблатом.',
    shortDescriptionUz:
      "Zamonaviy sport uslubini ta'sirchan qora-qizil skelet sirtqi taxta bilan uyg'unlashtirgan jasur xronograf.",
    descriptionRu:
      'Элегантный дизайн, сочетающий современный спортивный стиль с изысканной текстурой, создаёт смелый и уверенный визуальный образ. Корпус из нержавеющей стали 316L устойчив к коррозии и износу. Оснащены кварцевым хронографом Seiko, заключены в корпус 43 × 50,5 × 15,5 мм и дополнены трёхглазым чёрно-красным скелетонированным циферблатом, где центральная секундная стрелка отвечает за хронограф.',
    descriptionUz:
      "Zamonaviy sport uslubini nafis tekstura bilan uyg'unlashtirgan nafis dizayn jasur va o'ziga ishongan vizual ko'rinish yaratadi. Zanglamas po'lat 316L korpus korroziya va yeyilishga chidamli. Seiko kvarts xronograf mexanizmi bilan jihozlangan, 43 × 50.5 × 15.5mm o'lchamdagi korpusda joylashgan va markaziy soniya strelkasi xronograf vazifasini bajaradigan uch ko'zli qora-qizil skelet sirtqi taxta bilan yakunlangan.",
    featured: true,
    isNew: false,
    availability: 'in-stock',
  },
  {
    brand: 'Tsar Bomba',
    name: 'Reactor',
    reference: 'TB8213',
    relatedRefs: ['TB8227', 'TB8216', 'TB8229', 'TB8230'],
    images: [
      '/uploads/images/tsarbomba_tb8213_1.jpg',
      '/uploads/images/tsarbomba_tb8213_2.jpg',
      '/uploads/images/tsarbomba_tb8213_3.jpg',
    ],
    videos: [],
    colorLabel: 'Black / White',
    colorLabelRu: 'Чёрный / белый',
    colorLabelUz: 'Qora / oq',
    variants: [
      {
        refSuffix: 'A-03',
        colorLabel: 'Silver / Blue',
        colorLabelRu: 'Серебристый / синий',
        colorLabelUz: "Kumush / ko'k",
        images: ['/uploads/images/tsarbomba_tb8213_silver_blue_1.jpg', '/uploads/images/tsarbomba_tb8213_silver_blue_2.jpg'],
        videos: ['/uploads/videos/tsarbomba_tb8213_silver_blue.mp4'],
      },
      {
        refSuffix: 'Silver-White',
        colorLabel: 'Silver / White',
        colorLabelRu: 'Серебристый / белый',
        colorLabelUz: 'Kumush / oq',
        images: ['/uploads/images/tsarbomba_tb8213_silver_white_1.jpg', '/uploads/images/tsarbomba_tb8213_silver_white_2.jpg'],
      },
      {
        colorLabel: 'Silver / Orange',
        colorLabelRu: 'Серебристый / оранжевый',
        colorLabelUz: "Kumush / to'q sariq",
        images: [
          '/uploads/images/tsarbomba_tb8213_silver_orange_1.jpg',
          '/uploads/images/tsarbomba_tb8213_silver_orange_2.jpg',
          '/uploads/images/tsarbomba_tb8213_silver_orange_3.jpg',
        ],
      },
      {
        colorLabel: 'Silver / Black',
        colorLabelRu: 'Серебристый / чёрный',
        colorLabelUz: 'Kumush / qora',
        images: [
          '/uploads/images/tsarbomba_tb8213_silver_black_1.jpg',
          '/uploads/images/tsarbomba_tb8213_silver_black_2.jpg',
          '/uploads/images/tsarbomba_tb8213_silver_black_3.jpg',
        ],
      },
      {
        colorLabel: 'Silver / Red',
        colorLabelRu: 'Серебристый / красный',
        colorLabelUz: 'Kumush / qizil',
        images: [
          '/uploads/images/tsarbomba_tb8213_silver_red_1.jpg',
          '/uploads/images/tsarbomba_tb8213_silver_red_2.jpg',
          '/uploads/images/tsarbomba_tb8213_silver_red_3.jpg',
        ],
      },
      {
        colorLabel: 'Black / Yellow',
        colorLabelRu: 'Чёрный / жёлтый',
        colorLabelUz: 'Qora / sariq',
        images: [
          '/uploads/images/tsarbomba_tb8213_black_yellow_1.jpg',
          '/uploads/images/tsarbomba_tb8213_black_yellow_2.jpg',
          '/uploads/images/tsarbomba_tb8213_black_yellow_3.jpg',
        ],
      },
      {
        colorLabel: 'Black / Gold',
        colorLabelRu: 'Чёрный / золотой',
        colorLabelUz: 'Qora / oltin',
        images: [
          '/uploads/images/tsarbomba_tb8213_black_gold_1.jpg',
          '/uploads/images/tsarbomba_tb8213_black_gold_2.jpg',
          '/uploads/images/tsarbomba_tb8213_black_gold_3.jpg',
        ],
      },
      {
        colorLabel: 'Full Black',
        colorLabelRu: 'Полностью чёрный',
        colorLabelUz: "To'liq qora",
        images: [
          '/uploads/images/tsarbomba_tb8213_black_1.jpg',
          '/uploads/images/tsarbomba_tb8213_black_2.jpg',
          '/uploads/images/tsarbomba_tb8213_black_3.jpg',
        ],
      },
    ],
    price: 623.08,
    movement: 'Japanese, Automatic',
    caseMaterial: 'Stainless Steel 316L, Carbon Fiber Bezel',
    caseSize: '44 × 52 × 13mm',
    dial: 'Stacked three-tier display — minutes above, running seconds center, hours below',
    bracelet: 'Quick-release strap, 26mm',
    waterResistance: '10 ATM / 100m',
    shortDescription:
      'An asymmetric automatic with a quick-detach bezel-and-strap system and a stacked, multi-tier time display.',
    shortDescriptionRu:
      'Асимметричные автоматические часы с системой быстрой смены безеля и ремешка и многоуровневым дисплеем времени.',
    shortDescriptionUz:
      "Bezel va tasmani tezkor almashtirish tizimiga hamda ko'p qavatli vaqt displeyiga ega assimetrik avtomatik soat.",
    description:
      "Reactor is more than a refined, resilient automatic watch — it's a styling piece that lets you change looks and express your individuality. A quick-detach system makes swapping the bezel and strap effortless, crafted with a Japanese automatic movement, housed in a 44 × 52 × 13mm 316L stainless steel case with a carbon fiber bezel, and finished with a stacked three-tier display dial.",
    descriptionRu:
      'Часы Reactor — это больше, чем просто изысканные и прочные автоматические часы; это стильный аксессуар, который позволяет менять образы и выражать свою индивидуальность. Система быстрого отсоединения позволяет легко менять безель и ремешок. Оснащены японским автоматическим механизмом, заключены в корпус 44 × 52 × 13 мм из нержавеющей стали 316L с безелем из углеродного волокна и дополнены многоуровневым циферблатом.',
    descriptionUz:
      "Reactor — bu shunchaki nafis va bardoshli avtomatik soat emas, balki ko'rinishingizni almashtirish va o'zligingizni ifodalash imkonini beruvchi uslubiy buyum. Tezkor ajratish tizimi bezel va tasmani osongina almashtirish imkonini beradi. Yapon avtomatik mexanizmi bilan jihozlangan, 44 × 52 × 13mm o'lchamdagi uglerod tolali bezelli zanglamas po'lat 316L korpusda joylashgan va ko'p qavatli displey sirtqi taxta bilan yakunlangan.",
    featured: true,
    isNew: true,
    availability: 'sold',
  },
  {
    brand: 'Tsar Bomba',
    name: 'Reactor-Core Decay',
    reference: 'TB8227',
    relatedRefs: ['TB8213', 'TB8216', 'TB8222C'],
    images: [
      '/uploads/images/tsarbomba_tb8227_gold_1.jpg',
      '/uploads/images/tsarbomba_tb8227_gold_2.jpg',
      '/uploads/images/tsarbomba_tb8227_gold_3.jpg',
    ],
    videos: [],
    colorLabel: 'Gold',
    colorLabelRu: 'Золотой',
    colorLabelUz: 'Oltin',
    variants: [
      {
        colorLabel: 'Black',
        colorLabelRu: 'Чёрный',
        colorLabelUz: 'Qora',
        images: [
          '/uploads/images/tsarbomba_tb8227_black_1.jpg',
          '/uploads/images/tsarbomba_tb8227_black_2.jpg',
          '/uploads/images/tsarbomba_tb8227_black_3.jpg',
        ],
      },
      {
        colorLabel: 'Green',
        colorLabelRu: 'Зелёный',
        colorLabelUz: 'Yashil',
        images: [
          '/uploads/images/tsarbomba_tb8227_green_1.jpg',
          '/uploads/images/tsarbomba_tb8227_green_2.jpg',
          '/uploads/images/tsarbomba_tb8227_green_3.jpg',
        ],
      },
      {
        colorLabel: 'Red',
        colorLabelRu: 'Красный',
        colorLabelUz: 'Qizil',
        images: [
          '/uploads/images/tsarbomba_tb8227_red_1.jpg',
          '/uploads/images/tsarbomba_tb8227_red_2.jpg',
          '/uploads/images/tsarbomba_tb8227_red_3.jpg',
        ],
      },
    ],
    price: 1437.82,
    movement: 'Japanese, Automatic',
    caseMaterial: 'Stainless Steel 316L, Carbon Fiber Bezel',
    caseSize: '44 × 52 × 13mm',
    dial: 'Stacked three-tier display — minutes above, running seconds center, hours below',
    bracelet: 'Quick-release strap, 26mm',
    waterResistance: '10 ATM / 100m',
    shortDescription: 'The Reactor Core Decay — the same quick-detach, stacked-dial architecture in four bold colorways.',
    shortDescriptionRu: 'Reactor Core Decay — та же архитектура с быстросъёмной сменой и многоуровневым циферблатом в четырёх смелых цветах.',
    shortDescriptionUz: "Reactor Core Decay — xuddi shu tezkor almashtirish arxitekturasi va ko'p qavatli sirtqi taxta, to'rt jasur rangda.",
    descriptionRu:
      'Reactor Core Decay сохраняет фирменную асимметричную архитектуру Reactor с системой быстрой смены безеля и ремешка, предлагая четыре смелых цветовых решения — золотой, чёрный, зелёный и красный.',
    descriptionUz:
      "Reactor Core Decay Reactor'ning o'ziga xos assimetrik arxitekturasini, bezel va tasmani tezkor almashtirish tizimini saqlab qoladi — to'rt jasur rangda: oltin, qora, yashil va qizil.",
    featured: false,
    isNew: true,
    availability: 'sold',
  },
  {
    brand: 'Tsar Bomba',
    name: 'Neutron',
    reference: 'TB8216',
    relatedRefs: ['TB8213', 'TB8601', 'TB8222C'],
    images: [
      '/uploads/images/tsarbomba_tb8216_1.jpg',
      '/uploads/images/tsarbomba_tb8216_2.jpg',
      '/uploads/images/tsarbomba_tb8216_3.jpg',
    ],
    videos: ['/uploads/videos/tsarbomba_tb8216.mp4'],
    colorLabel: 'Black',
    colorLabelRu: 'Чёрный',
    colorLabelUz: 'Qora',
    variants: [
      {
        refSuffix: '02',
        colorLabel: 'Red',
        colorLabelRu: 'Красный',
        colorLabelUz: 'Qizil',
        images: ['/uploads/images/tsarbomba_tb8216_red_1.jpg', '/uploads/images/tsarbomba_tb8216_red_2.jpg'],
        videos: ['/uploads/videos/tsarbomba_tb8216_red.mp4'],
      },
      {
        refSuffix: '03',
        colorLabel: 'Blue',
        colorLabelRu: 'Синий',
        colorLabelUz: "Ko'k",
        images: ['/uploads/images/tsarbomba_tb8216_blue_1.jpg', '/uploads/images/tsarbomba_tb8216_blue_2.jpg'],
      },
    ],
    price: 999.99,
    movement: 'Seiko, Automatic',
    caseMaterial: 'Titanium, Carbon Fiber Bezel',
    caseSize: '46 × 50.7 × 14.3mm',
    dial: 'Openworked skeleton',
    bracelet: 'Fluorocarbon rubber, quick-release, 26mm',
    waterResistance: '5 ATM / 50m',
    shortDescription:
      'A 500-piece limited edition in titanium and carbon fiber, its openworked architecture visible through a high-grade crystal.',
    shortDescriptionRu:
      'Лимитированная серия из 500 экземпляров в титане и карбоне — скелетонированная архитектура открыта взору через стекло высокого класса.',
    shortDescriptionUz:
      "Titan va uglerod tolasidan yaratilgan, atigi 500 nusxadagi limitli seriya — yuqori sifatli oyna orqali skelet arxitektura to'liq ko'rinadi.",
    description:
      'A global limited edition of only 500 pieces, crafted with avant-garde materials such as titanium and carbon fiber to create a case that is exceptionally lightweight and remarkably strong. Through the high-grade crystal, the intricate skeletonized architecture is revealed in full, where every movement embodies precision and mechanical artistry. Crafted with a Seiko automatic movement, housed in a 46 × 50.7 × 14.3mm titanium case, and finished with an openworked skeleton dial.',
    descriptionRu:
      'Глобальный лимитированный выпуск всего 500 экземпляров — изготовлен из авангардных материалов, таких как титан и карбоновое волокно, что делает корпус исключительно лёгким и прочным. Сквозь стекло высокого класса открывается детально проработанная скелетонированная архитектура, где каждое движение — воплощение точности и механического мастерства. Оснащены автоматическим механизмом Seiko, заключены в титановый корпус 46 × 50,7 × 14,3 мм и дополнены ажурным скелетонированным циферблатом.',
    descriptionUz:
      "Butun dunyo bo'yicha atigi 500 nusxadagi limitli seriya — titan va uglerod tolasi kabi avangard materiallardan yaratilgan bo'lib, korpusni g'oyat yengil va mustahkam qiladi. Yuqori sifatli oyna orqali nozik ishlangan skelet arxitektura to'liq ko'rinadi, bunda har bir harakat aniqlik va mexanik mahoratning timsolidir. Avtomatik Seiko mexanizmi bilan jihozlangan, 46 × 50.7 × 14.3mm o'lchamdagi titan korpusda joylashgan va ajoyib skelet sirtqi taxta bilan yakunlangan.",
    featured: true,
    isNew: true,
    availability: 'reserved',
  },
  {
    brand: 'Tsar Bomba',
    name: 'Atomic',
    reference: 'TB8222C',
    relatedRefs: ['TB8226C', 'TB8216', 'TB8601', 'TB8229'],
    images: [
      '/uploads/images/tsarbomba_tb8222c_white_1.jpg',
      '/uploads/images/tsarbomba_tb8222c_white_2.jpg',
      '/uploads/images/tsarbomba_tb8222c_white_3.jpg',
      '/uploads/images/tsarbomba_tb8222c_white_4.jpg',
    ],
    videos: ['/uploads/videos/tsarbomba_tb8222c.mp4'],
    colorLabel: 'White',
    colorLabelRu: 'Белый',
    colorLabelUz: 'Oq',
    variants: [
      {
        colorLabel: 'Lake Blue',
        colorLabelRu: 'Голубой',
        colorLabelUz: "Ko'l ko'k",
        images: [
          '/uploads/images/tsarbomba_tb8222c_lake_blue_1.jpg',
          '/uploads/images/tsarbomba_tb8222c_lake_blue_2.jpg',
          '/uploads/images/tsarbomba_tb8222c_lake_blue_3.jpg',
          '/uploads/images/tsarbomba_tb8222c_lake_blue_4.jpg',
        ],
      },
      {
        colorLabel: 'Yellow',
        colorLabelRu: 'Жёлтый',
        colorLabelUz: 'Sariq',
        images: [
          '/uploads/images/tsarbomba_tb8222c_yellow_1.jpg',
          '/uploads/images/tsarbomba_tb8222c_yellow_2.jpg',
          '/uploads/images/tsarbomba_tb8222c_yellow_3.jpg',
          '/uploads/images/tsarbomba_tb8222c_yellow_4.jpg',
        ],
      },
      {
        colorLabel: 'Ghost Grey',
        colorLabelRu: 'Призрачно-серый',
        colorLabelUz: 'Kulrang',
        images: [
          '/uploads/images/tsarbomba_tb8222c_ghost_grey_1.jpg',
          '/uploads/images/tsarbomba_tb8222c_ghost_grey_2.jpg',
          '/uploads/images/tsarbomba_tb8222c_ghost_grey_3.jpg',
          '/uploads/images/tsarbomba_tb8222c_ghost_grey_4.jpg',
        ],
      },
      {
        colorLabel: 'Brown',
        colorLabelRu: 'Коричневый',
        colorLabelUz: 'Jigarrang',
        images: [
          '/uploads/images/tsarbomba_tb8222c_brown_1.jpg',
          '/uploads/images/tsarbomba_tb8222c_brown_2.jpg',
          '/uploads/images/tsarbomba_tb8222c_brown_3.jpg',
          '/uploads/images/tsarbomba_tb8222c_brown_4.jpg',
        ],
      },
    ],
    price: 1917.34,
    movement: 'Miyota 9100, Automatic',
    caseMaterial: 'Full Ceramic',
    caseSize: '45 × 50.5 × 15.5mm',
    dial: 'Triple sub-dial — power reserve, day/date, 24-hour indicator',
    bracelet: 'Silicone strap, 26mm',
    waterResistance: '5 ATM / 50m',
    shortDescription:
      'A full-ceramic automatic with a power-reserve indicator, scratch-resistant and engineered for daily wear.',
    shortDescriptionRu:
      'Керамические автоматические часы с индикатором запаса хода — устойчивы к царапинам и созданы для ежедневной носки.',
    shortDescriptionUz:
      "Zaxira ko'rsatkichiga ega, keramik korpusli avtomatik soat — chizilishga chidamli va har kunlik foydalanish uchun yaratilgan.",
    descriptionRu:
      'Керамический корпус сочетает в себе лёгкость и устойчивость к царапинам. Оснащены японским автоматическим механизмом Miyota 9100 с индикатором запаса хода и датой, заключены в корпус 45 × 50,5 × 15,5 мм и дополнены тройным вспомогательным циферблатом.',
    descriptionUz:
      "Keramik korpus yengillik va chizilishga chidamlilikni o'zida uyg'unlashtiradi. Zaxira ko'rsatkichi va sana funksiyasiga ega yapon avtomatik Miyota 9100 mexanizmi bilan jihozlangan, 45 × 50.5 × 15.5mm o'lchamdagi korpusda joylashgan va uchlik yordamchi sirtqi taxta bilan yakunlangan.",
    featured: true,
    isNew: true,
    availability: 'sold',
  },
  {
    brand: 'Tsar Bomba',
    name: 'Parallax',
    reference: 'TB8229',
    relatedRefs: ['TB8230', 'TB8213', 'TB8222C'],
    images: [
      '/uploads/images/tsarbomba_tb8229_1.jpg',
      '/uploads/images/tsarbomba_tb8229_2.jpg',
      '/uploads/images/tsarbomba_tb8229_3.jpg',
    ],
    videos: [],
    colorLabel: 'Titanium Grey',
    colorLabelRu: 'Титаново-серый',
    colorLabelUz: 'Titan-kulrang',
    variants: [
      {
        refSuffix: 'C-02',
        colorLabel: 'Ceramic Lake Blue',
        colorLabelRu: 'Керамический синий',
        colorLabelUz: "Keramik ko'k",
        images: ['/uploads/images/tsarbomba_tb8229_c02_1.jpg', '/uploads/images/tsarbomba_tb8229_c02_2.jpg'],
      },
      {
        refSuffix: 'CF-01',
        colorLabel: 'Carbon Fiber Black',
        colorLabelRu: 'Карбоновый чёрный',
        colorLabelUz: 'Uglerod tolali qora',
        images: ['/uploads/images/tsarbomba_tb8229_cf01_1.jpg', '/uploads/images/tsarbomba_tb8229_cf01_2.jpg'],
      },
    ],
    price: 2500,
    movement: 'Japanese, Automatic',
    caseMaterial: 'Stainless Steel 316L, Ceramic/Carbon Fiber Bezel',
    caseSize: '43.2 × 51.3 × 14.1mm',
    dial: 'Power-reserve indicator, barrel-shaped case',
    bracelet: 'FKM rubber, quick-release, 22mm',
    waterResistance: '5 ATM / 50m',
    shortDescription:
      'A barrel-cased automatic with a ceramic-and-carbon bezel and a bold, high-tech silhouette.',
    shortDescriptionRu:
      'Автоматические часы бочкообразной формы с керамическо-карбоновым безелем и смелым, высокотехнологичным силуэтом.',
    shortDescriptionUz:
      "Keramika-uglerod bezelli va jasur, yuqori texnologiyali siluetga ega bochkasimon avtomatik soat.",
    descriptionRu:
      'Вдохновлённый высокотехнологичной инженерией, характерный корпус в форме бочонка создаёт смелый, современный образ, приковывающий внимание с любого ракурса. Оснащены японским автоматическим механизмом, заключены в корпус 43,2 × 51,3 × 14,1 мм из нержавеющей стали с керамическо-карбоновым безелем и дополнены индикатором запаса хода.',
    descriptionUz:
      "Yuqori texnologik muhandislikdan ilhomlangan, o'ziga xos bochkasimon korpus har qanday burchakdan diqqatni tortadigan jasur, zamonaviy ko'rinish yaratadi. Yapon avtomatik mexanizmi bilan jihozlangan, 43.2 × 51.3 × 14.1mm o'lchamdagi keramika-uglerod bezelli zanglamas po'lat korpusda joylashgan va zaxira ko'rsatkichi bilan yakunlangan.",
    featured: false,
    isNew: true,
    availability: 'in-stock',
  },
  {
    brand: 'Tsar Bomba',
    name: 'Skunk Works T1',
    reference: 'T2C6101',
    relatedRefs: ['TB8222C', 'TB8223', 'TB8601'],
    images: [
      '/uploads/images/tsarbomba_skunkworks_t1_1.jpg',
      '/uploads/images/tsarbomba_skunkworks_t1_2.jpg',
      '/uploads/images/tsarbomba_skunkworks_t1_3.jpg',
    ],
    videos: [],
    price: 3000,
    movement: 'Miyota, Automatic',
    caseMaterial: 'Stainless Steel 316L',
    caseSize: '44 × 51.5 × 14.5mm',
    dial: 'Openworked skeleton, sculptural round case',
    bracelet: 'FKM rubber, quick-release, 22mm',
    waterResistance: '5 ATM / 50m',
    shortDescription:
      'A sculptural round skeleton automatic engineered in premium 316L stainless steel, available for pre-order.',
    shortDescriptionRu:
      'Скульптурные круглые скелетон-часы из премиальной стали 316L — доступны для предзаказа.',
    shortDescriptionUz:
      "Premium 316L po'latdan yaratilgan haykaltaroshlik uslubidagi dumaloq skelet soat — oldindan buyurtma uchun mavjud.",
    descriptionRu:
      'Скульптурный круглый корпус и современная скелетонизированная архитектура создают выразительный силуэт, который эффектно смотрится с любого ракурса. Циферблат с ажурным дизайном открывает взору сложный механизм, подчёркивая мастерство исполнения каждой движущейся детали. Премиальная нержавеющая сталь марки 316L обеспечивает исключительную прочность, устойчивость к коррозии и изысканную отделку.',
    descriptionUz:
      "Haykaltaroshlik uslubidagi dumaloq korpus va zamonaviy skelet arxitektura har qanday burchakdan ta'sirchan ko'rinadigan ifodali siluet yaratadi. Ajoyib dizayndagi sirtqi taxta murakkab mexanizmni ko'z oldingizda ochib beradi, har bir harakatlanuvchi qismning mahorat bilan bajarilganini ta'kidlaydi. Premium 316L markali zanglamas po'lat mustahkamlik, korroziyaga chidamlilik va nafis pardozni ta'minlaydi.",
    featured: true,
    isNew: true,
    availability: 'made-to-order',
  },
  {
    brand: 'Tsar Bomba',
    name: 'Nucleus Femme 01',
    reference: 'TB8215',
    relatedRefs: ['TB8233LG', 'TB8231L', 'TB8220L'],
    images: ['/uploads/images/tsarbomba_tb8215l_1.jpg', '/uploads/images/tsarbomba_tb8215l_2.jpg'],
    videos: ['/uploads/videos/tsarbomba_tb8215l.mp4'],
    colorLabel: 'White',
    colorLabelRu: 'Белый',
    colorLabelUz: 'Oq',
    price: 599.99,
    movement: 'Swiss Ronda, Quartz',
    caseMaterial: 'Stainless Steel 316L, Cubic Zirconia Bezel',
    caseSize: '44 × 44 × 12mm',
    dial: 'Round, cubic zirconia spiral pattern',
    bracelet: 'Leather strap, 200 × 20mm',
    waterResistance: '3 ATM / 30m',
    shortDescription: 'A mesmerizing hollow design celebrating light and symmetry — dial and bezel set with cubic zirconia.',
    shortDescriptionRu:
      'Завораживающий полый дизайн, воспевающий свет и симметрию — циферблат и безель инкрустированы кубическим цирконием.',
    shortDescriptionUz:
      "Yorug'lik va simmetriyani kuylovchi sehrli bo'sh dizayn — sirtqi taxta va bezel kubik sirkoniy bilan bezatilgan.",
    descriptionRu:
      'Завораживающий полый дизайн, воспевающий свет и симметрию — часы для современной женщины с циферблатом и безелем, инкрустированными кубическим цирконием. Элегантный кожаный ремешок дополняет блестящий дизайн, подходя для деловых и повседневных мероприятий.',
    descriptionUz:
      "Yorug'lik va simmetriyani kuylovchi sehrli bo'sh dizayn — zamonaviy ayol uchun sirtqi taxta va bezeli kubik sirkoniy bilan bezatilgan soat. Nafis charm tasma yorqin dizaynni to'ldirib, ish va kundalik tadbirlarga bab-baravar mos keladi.",
    featured: false,
    isNew: true,
    availability: 'in-stock',
  },
  {
    brand: 'Tsar Bomba',
    name: 'Dark Matter 1',
    reference: 'TB8601',
    relatedRefs: ['TB8602', 'TB8603', 'TB8223', 'TB8222C'],
    images: ['/uploads/images/tsarbomba_tb8601_black_1.jpg', '/uploads/images/tsarbomba_tb8601_black_2.jpg'],
    videos: ['/uploads/videos/tsarbomba_tb8601_black.mp4'],
    colorLabel: 'Black',
    colorLabelRu: 'Чёрный',
    colorLabelUz: 'Qora',
    variants: [
      {
        refSuffix: 'Blue',
        colorLabel: 'Blue',
        colorLabelRu: 'Синий',
        colorLabelUz: "Ko'k",
        images: ['/uploads/images/tsarbomba_tb8601_blue_1.jpg', '/uploads/images/tsarbomba_tb8601_blue_2.jpg'],
      },
    ],
    price: 1150.7,
    movement: 'Miyota, Automatic',
    caseMaterial: 'Stainless Steel 316L, Carbon Fiber / Steel Bezel',
    caseSize: '43 × 53.5 × 14.5mm',
    dial: 'Skeletonized, interchangeable components',
    bracelet: 'FKM rubber, quick-release, 26mm',
    waterResistance: '5 ATM / 50m',
    shortDescription: 'A timeless, bold automatic — every curve and detail of the skeletonized case reflects refined craftsmanship.',
    shortDescriptionRu:
      'Неподвластная времени элегантность и смелое присутствие — каждый изгиб скелетонированного корпуса отражает утончённое мастерство.',
    shortDescriptionUz:
      "Vaqtga bo'ysunmaydigan nafislik va jasur ko'rinish — skelet korpusning har bir egri chizig'i nozik ustalikni aks ettiradi.",
    descriptionRu:
      'Неподвластная времени элегантность, смелое присутствие. Каждый изгиб и деталь этих автоматических часов отражают утончённое мастерство. Их элегантный современный дизайн легко дополняет как повседневный, так и формальный стиль, делая заявление на любом запястье.',
    descriptionUz:
      "Vaqtga bo'ysunmaydigan nafislik, jasur ko'rinish. Ushbu avtomatik soatning har bir egri chizig'i va detali nozik ustalikni aks ettiradi. Uning nafis zamonaviy dizayni kundalik va rasmiy uslubga bab-baravar mos keladi va har qanday bilakda o'ziga jalb qiladi.",
    featured: false,
    isNew: true,
    availability: 'sold',
  },
  {
    brand: 'Tsar Bomba',
    name: 'Dark Matter 2',
    reference: 'TB8602',
    relatedRefs: ['TB8601', 'TB8603', 'TB8222C'],
    images: [
      '/uploads/images/tsarbomba_tb8602_black_1.jpg',
      '/uploads/images/tsarbomba_tb8602_black_2.jpg',
      '/uploads/images/tsarbomba_tb8602_black_3.jpg',
    ],
    videos: ['/uploads/videos/tsarbomba_tb8602.mp4'],
    colorLabel: 'Black',
    colorLabelRu: 'Чёрный',
    colorLabelUz: 'Qora',
    variants: [
      {
        colorLabel: 'Black / Blue',
        colorLabelRu: 'Чёрный / синий',
        colorLabelUz: "Qora / ko'k",
        images: [
          '/uploads/images/tsarbomba_tb8602_black_blue_1.jpg',
          '/uploads/images/tsarbomba_tb8602_black_blue_2.jpg',
          '/uploads/images/tsarbomba_tb8602_black_blue_3.jpg',
        ],
      },
      {
        colorLabel: 'Orange / Black',
        colorLabelRu: 'Оранжевый / чёрный',
        colorLabelUz: "To'q sariq / qora",
        images: [
          '/uploads/images/tsarbomba_tb8602_orange_black_1.jpg',
          '/uploads/images/tsarbomba_tb8602_orange_black_2.jpg',
          '/uploads/images/tsarbomba_tb8602_orange_black_3.jpg',
        ],
      },
      {
        colorLabel: 'Blue / Black',
        colorLabelRu: 'Синий / чёрный',
        colorLabelUz: "Ko'k / qora",
        images: [
          '/uploads/images/tsarbomba_tb8602_blue_black_1.jpg',
          '/uploads/images/tsarbomba_tb8602_blue_black_2.jpg',
          '/uploads/images/tsarbomba_tb8602_blue_black_3.jpg',
        ],
      },
    ],
    price: 1437.82,
    movement: 'Miyota, Automatic',
    caseMaterial: 'Stainless Steel 316L, Carbon Fiber Bezel',
    caseSize: '43 × 53.5 × 14.5mm',
    dial: 'Skeletonized, interchangeable components',
    bracelet: 'FKM rubber, quick-release, 26mm',
    waterResistance: '5 ATM / 50m',
    shortDescription: 'The second Dark Matter interchangeable set, in four skeletonized colorways.',
    shortDescriptionRu: 'Второй комплект Dark Matter — скелетонированные часы в четырёх цветовых решениях.',
    shortDescriptionUz: "Dark Matter to'plamining ikkinchi varianti — to'rt xil rangdagi skelet soat.",
    descriptionRu:
      'Второй интерчейнджбл-комплект коллекции Dark Matter — скелетонированный автоматический корпус, доступный в чёрном, чёрно-синем, оранжево-чёрном и сине-чёрном исполнении.',
    descriptionUz:
      "Dark Matter kolleksiyasining ikkinchi almashtiriladigan to'plami — qora, qora-ko'k, to'q sariq-qora va ko'k-qora variantlarida mavjud skelet avtomatik korpus.",
    featured: false,
    isNew: true,
    availability: 'sold',
  },
  {
    brand: 'Tsar Bomba',
    name: 'Dark Matter 3',
    reference: 'TB8603',
    relatedRefs: ['TB8601', 'TB8602', 'TB8222C'],
    images: [
      '/uploads/images/tsarbomba_tb8603_black_1.jpg',
      '/uploads/images/tsarbomba_tb8603_black_2.jpg',
      '/uploads/images/tsarbomba_tb8603_black_3.jpg',
    ],
    videos: [],
    colorLabel: 'Black',
    colorLabelRu: 'Чёрный',
    colorLabelUz: 'Qora',
    variants: [
      {
        colorLabel: 'Black / Blue',
        colorLabelRu: 'Чёрный / синий',
        colorLabelUz: "Qora / ko'k",
        images: [
          '/uploads/images/tsarbomba_tb8603_black_blue_1.jpg',
          '/uploads/images/tsarbomba_tb8603_black_blue_2.jpg',
          '/uploads/images/tsarbomba_tb8603_black_blue_3.jpg',
        ],
      },
      {
        colorLabel: 'Black / Red',
        colorLabelRu: 'Чёрный / красный',
        colorLabelUz: 'Qora / qizil',
        images: [
          '/uploads/images/tsarbomba_tb8603_black_red_1.jpg',
          '/uploads/images/tsarbomba_tb8603_black_red_2.jpg',
          '/uploads/images/tsarbomba_tb8603_black_red_3.jpg',
        ],
      },
      {
        colorLabel: 'Blue / Black',
        colorLabelRu: 'Синий / чёрный',
        colorLabelUz: "Ko'k / qora",
        images: [
          '/uploads/images/tsarbomba_tb8603_blue_black_1.jpg',
          '/uploads/images/tsarbomba_tb8603_blue_black_2.jpg',
          '/uploads/images/tsarbomba_tb8603_blue_black_3.jpg',
        ],
      },
    ],
    price: 1917.34,
    movement: 'Miyota, Automatic',
    caseMaterial: 'Stainless Steel 316L, Carbon Fiber Bezel',
    caseSize: '43 × 53.5 × 14.5mm',
    dial: 'Skeletonized, interchangeable components',
    bracelet: 'FKM rubber, quick-release, 26mm',
    waterResistance: '5 ATM / 50m',
    shortDescription: 'The third Dark Matter interchangeable set, in four skeletonized colorways.',
    shortDescriptionRu: 'Третий комплект Dark Matter — скелетонированные часы в четырёх цветовых решениях.',
    shortDescriptionUz: "Dark Matter to'plamining uchinchi varianti — to'rt xil rangdagi skelet soat.",
    descriptionRu:
      'Третий интерчейнджбл-комплект коллекции Dark Matter — скелетонированный автоматический корпус в чёрном, чёрно-синем, чёрно-красном и сине-чёрном исполнении.',
    descriptionUz:
      "Dark Matter kolleksiyasining uchinchi almashtiriladigan to'plami — qora, qora-ko'k, qora-qizil va ko'k-qora variantlarida mavjud skelet avtomatik korpus.",
    featured: false,
    isNew: true,
    availability: 'sold',
  },
  {
    brand: 'Tsar Bomba',
    name: 'Electron',
    reference: 'TB8230',
    relatedRefs: ['TB8401CF', 'TB8229', 'TB8213', 'TB8204Q'],
    images: ['/uploads/images/tsarbomba_tb8230_01_1.jpg', '/uploads/images/tsarbomba_tb8230_01_2.jpg'],
    videos: [],
    colorLabel: 'Steel / Black',
    colorLabelRu: 'Сталь / чёрный',
    colorLabelUz: "Po'lat / qora",
    variants: [
      {
        refSuffix: '02',
        colorLabel: 'All Black',
        colorLabelRu: 'Полностью чёрный',
        colorLabelUz: "To'liq qora",
        images: ['/uploads/images/tsarbomba_tb8230_02_1.jpg', '/uploads/images/tsarbomba_tb8230_02_2.jpg'],
      },
      {
        colorLabel: 'Rose Gold / Carbon',
        colorLabelRu: 'Розовое золото / карбон',
        colorLabelUz: "Pushti oltin / uglerod tolasi",
        images: [
          '/uploads/images/tsarbomba_tb8230_rose_gold_1.jpg',
          '/uploads/images/tsarbomba_tb8230_rose_gold_2.jpg',
          '/uploads/images/tsarbomba_tb8230_rose_gold_3.jpg',
          '/uploads/images/tsarbomba_tb8230_rose_gold_4.jpg',
        ],
      },
      {
        colorLabel: 'Gold / Carbon',
        colorLabelRu: 'Золото / карбон',
        colorLabelUz: "Oltin / uglerod tolasi",
        images: [
          '/uploads/images/tsarbomba_tb8230_gold_1.jpg',
          '/uploads/images/tsarbomba_tb8230_gold_2.jpg',
          '/uploads/images/tsarbomba_tb8230_gold_3.jpg',
          '/uploads/images/tsarbomba_tb8230_gold_4.jpg',
        ],
      },
      {
        colorLabel: 'Green / Carbon',
        colorLabelRu: 'Зелёный / карбон',
        colorLabelUz: "Yashil / uglerod tolasi",
        images: [
          '/uploads/images/tsarbomba_tb8230_green_1.jpg',
          '/uploads/images/tsarbomba_tb8230_green_2.jpg',
          '/uploads/images/tsarbomba_tb8230_green_3.jpg',
          '/uploads/images/tsarbomba_tb8230_green_4.jpg',
        ],
        videos: ['/uploads/videos/tsarbomba_tb8230_green.mp4'],
      },
    ],
    price: 719.28,
    movement: 'Miyota, Automatic',
    caseMaterial: 'Stainless Steel 316L, Carbon Fiber Bezel',
    caseSize: '45 × 50.7 × 14mm',
    dial: 'Carbon fiber multi-layer dial',
    bracelet: 'Premium fluorocarbon rubber, 22mm, deployable clasp',
    waterResistance: '10 ATM / 100m',
    shortDescription: 'A bold, dynamic automatic with a sculptural case and angular, carbon-fiber multi-layer dial.',
    shortDescriptionRu:
      'Смелые, динамичные автоматические часы со скульптурным корпусом и многослойным карбоновым циферблатом.',
    shortDescriptionUz:
      "Haykaltaroshlik uslubidagi korpus va ko'p qatlamli uglerod tolali sirtqi taxtaga ega jasur, dinamik avtomatik soat.",
    descriptionRu:
      'Смелый и динамичный дизайн, вдохновлённый производительностью и точностью. Скульптурный корпус, угловатые детали и многослойные текстуры создают динамичный образ, созданный для тех, кто привык выделяться.',
    descriptionUz:
      "Unumdorlik va aniqlikdan ilhomlangan jasur va dinamik dizayn. Haykaltaroshlik uslubidagi korpus, burchakli detallar va ko'p qatlamli teksturalar ajralib turishga o'rgangan insonlar uchun yaratilgan dinamik ko'rinishni shakllantiradi.",
    featured: false,
    isNew: true,
    availability: 'sold',
  },
  {
    brand: 'Tsar Bomba',
    name: 'Light Matter',
    reference: 'TB8223',
    images: ['/uploads/images/tsarbomba_tb8223_1.jpg', '/uploads/images/tsarbomba_tb8223_2.jpg'],
    videos: ['/uploads/videos/tsarbomba_tb8223.mp4'],
    relatedRefs: ['T2C6101', 'TB8601', 'TB8222C'],
    colorLabel: 'Crystal Clear',
    colorLabelRu: 'Прозрачный кристалл',
    colorLabelUz: 'Shaffof kristall',
    price: 2200,
    movement: 'Automatic (Japanese), 21,600 vph, visible skeleton rotor',
    caseMaterial: 'Chronite®, Full Sapphire Bezel',
    caseSize: '45 × 51 × 14.3mm',
    dial: 'Fully skeletonized, sapphire dial and bezel',
    bracelet: 'Fluorocarbon strap with deployable clasp, 26mm',
    waterResistance: '3 ATM / 30m',
    shortDescription:
      'A transparent fortress in Chronite® — a full sapphire bezel and dial let the mechanism appear suspended in pure light.',
    shortDescriptionRu:
      'Прозрачная крепость из Chronite® — полностью сапфировые безель и циферблат создают эффект парящего в свете механизма.',
    shortDescriptionUz:
      "Chronite®'dan yaratilgan shaffof qal'a — to'liq safir bezel va sirtqi taxta mexanizmni yorug'likda muallaq turgandek ko'rsatadi.",
    descriptionRu:
      'Коллекция Light Matter воплощает видение TSAR BOMBA о прозрачном часовом искусстве. Полностью сапфировые безель и циферблат бесшовно интегрированы с запатентованным корпусом и задней крышкой из Chronite®, создавая прозрачную крепость, где механизм словно парит в чистом свете. Скелетонированный циферблат раскрывает сложные шестерни и баланс, превращая измерение времени в визуальное зрелище.',
    descriptionUz:
      "Light Matter kolleksiyasi TSAR BOMBA'ning shaffof soatsozlik san'ati haqidagi qarashini mujassamlashtiradi. To'liq safir bezel va sirtqi taxta patentlangan Chronite® korpus va orqa qopqoq bilan uzluksiz birlashtirilgan bo'lib, mexanizm sof yorug'likda muallaq turgandek ko'rinadigan shaffof qal'ani yaratadi. Skelet sirtqi taxta murakkab tishli g'ildiraklar va balansni ochib beradi, vaqtni o'lchashni vizual tomoshaga aylantiradi.",
    featured: true,
    isNew: true,
    availability: 'made-to-order',
  },
  {
    brand: 'Tsar Bomba',
    name: 'Lumina',
    reference: 'TB8233LG',
    relatedRefs: ['TB8231L', 'TB8220L', 'TB8215'],
    images: ['/uploads/images/tsarbomba_tb8233l_1.jpg', '/uploads/images/tsarbomba_tb8233l_2.jpg'],
    videos: [],
    colorLabel: 'Gold / White',
    colorLabelRu: 'Золотой / белый',
    colorLabelUz: 'Oltin / oq',
    price: 1400,
    movement: 'Japanese, Automatic, Sapphire Crystal',
    caseMaterial: 'Stainless Steel 316L',
    caseSize: '35 × 42.5 × 11.3mm',
    dial: 'Luminous hands, Grade A visibility',
    bracelet: 'Rubber strap, 195 × 14mm',
    waterResistance: '5 ATM / 50m',
    shortDescription: "An automatic built for women who value restraint, accuracy, and timeless beauty — adventure-ready with Grade A luminous hands.",
    shortDescriptionRu:
      'Автоматические часы для женщин, ценящих сдержанность, точность и непреходящую красоту — с люминесцентными стрелками класса А.',
    shortDescriptionUz:
      "Sobitlik, aniqlik va abadiy go'zallikni qadrlaydigan ayollar uchun avtomatik soat — A toifali lyuminestsent strelkalar bilan.",
    descriptionRu:
      'Элегантность и точность для женщин, ценящих сдержанность, аккуратность и непреходящую красоту. Премиальные материалы и готовность к приключениям сочетаются с люминесцентными стрелками класса А, обеспечивающими видимость в любых условиях освещения.',
    descriptionUz:
      "Sobitlik, aniqlik va abadiy go'zallikni qadrlaydigan ayollar uchun nafislik va aniqlik. Premium materiallar va sarguzashtga tayyorlik har qanday yorug'lik sharoitida ko'rinadigan A toifali lyuminestsent strelkalar bilan uyg'unlashtirilgan.",
    featured: false,
    isNew: true,
    availability: 'made-to-order',
  },
  {
    brand: 'Tsar Bomba',
    name: 'Nucleus Femme 04',
    reference: 'TB8231L',
    relatedRefs: ['TB8233LG', 'TB8220L', 'TB8215'],
    images: ['/uploads/images/tsarbomba_tb8231l_1.jpg', '/uploads/images/tsarbomba_tb8231l_2.jpg'],
    videos: [],
    colorLabel: 'White / Silver',
    colorLabelRu: 'Белый / серебристый',
    colorLabelUz: 'Oq / kumush',
    price: 500,
    movement: 'Swiss Ronda, Quartz',
    caseMaterial: 'Stainless Steel 316L',
    caseSize: '35 × 42.5 × 10.8mm',
    dial: 'Minimalist, cubic zirconia circle',
    bracelet: 'Strap, 195 × 14mm',
    waterResistance: '5 ATM / 50m',
    shortDescription: 'Crafted for women who value restraint, precision, and lasting beauty — a minimalist dial framed by cubic zirconia.',
    shortDescriptionRu:
      'Создано для женщин, которые ценят сдержанность, точность и непреходящую красоту — минималистичный циферблат в обрамлении кубического циркония.',
    shortDescriptionUz:
      "Sobitlik, aniqlik va abadiy go'zallikni qadrlaydigan ayollar uchun yaratilgan — kubik sirkoniy bilan o'ralgan minimalistik sirtqi taxta.",
    descriptionRu:
      'Создано для женщин, которые ценят сдержанность, точность и непреходящую красоту. Минималистичный циферблат обрамлён сверкающим кругом из кубического циркония, который ловит свет при каждом движении запястья, воплощая изысканную роскошь.',
    descriptionUz:
      "Sobitlik, aniqlik va abadiy go'zallikni qadrlaydigan ayollar uchun yaratilgan. Minimalistik sirtqi taxta har bir bilak harakatida yorug'likni tutib turadigan porloq kubik sirkoniy doira bilan o'ralgan bo'lib, nafis hashamatni mujassamlashtiradi.",
    featured: false,
    isNew: true,
    availability: 'in-stock',
  },
  {
    brand: 'Tsar Bomba',
    name: 'Nucleus Femme 03',
    reference: 'TB8220L',
    relatedRefs: ['TB8233LG', 'TB8231L', 'TB8215'],
    images: ['/uploads/images/tsarbomba_tb8220l_1.jpg', '/uploads/images/tsarbomba_tb8220l_2.jpg'],
    videos: ['/uploads/videos/tsarbomba_tb8220l.mp4'],
    colorLabel: 'Lake Blue',
    colorLabelRu: 'Голубой',
    colorLabelUz: "Ko'l ko'k",
    price: 1200,
    movement: 'Swiss Ronda, Quartz',
    caseMaterial: 'Full Ceramic',
    caseSize: '35 × 39.5 × 10.3mm',
    dial: 'Cubic zirconia (diamond) accents',
    bracelet: 'Strap, 210 × 18mm',
    waterResistance: '5 ATM / 50m',
    shortDescription: 'An exquisite watch for the modern woman — a full ceramic case with exceptional durability, framed by cubic zirconia accents.',
    shortDescriptionRu:
      'Изысканные часы для современной женщины — полностью керамический корпус с исключительной прочностью, обрамлённый кубическим цирконием.',
    shortDescriptionUz:
      "Zamonaviy ayol uchun nafis soat — mustahkam to'liq keramik korpus, kubik sirkoniy bilan bezatilgan.",
    descriptionRu:
      'Изысканные часы для современной женщины, созданные для тех, кто ценит сдержанность, точность и непреходящую красоту. Отличаются полностью керамическим корпусом из высокотехнологичной керамики с исключительной прочностью и устойчивостью к царапинам. Циферблат обрамлён ослепительным кругом из кубического циркония, который ловит свет при каждом движении запястья.',
    descriptionUz:
      "Sobitlik, aniqlik va abadiy go'zallikni qadrlaydiganlar uchun yaratilgan, zamonaviy ayol uchun nafis soat. Yuqori texnologiyali keramikadan yaratilgan to'liq keramik korpus mustahkamligi va chizilishga chidamliligi bilan ajralib turadi. Sirtqi taxta har bir bilak harakatida yorug'likni tutib turadigan porloq kubik sirkoniy doira bilan o'ralgan.",
    featured: false,
    isNew: true,
    availability: 'in-stock',
  },
  {
    brand: 'Tsar Bomba',
    name: 'Deployment Buckle Clasp',
    reference: 'DEPLOYMENT-BUCKLE',
    type: 'accessory',
    compatibleWithRefs: [
      'TB8208CF',
      'TB8204Q',
      'TB8213',
      'TB8216',
      'TB8222C',
      'TB8229',
      'T2C6101',
      'TB8223',
      'TB8233LG',
      'TB8231L',
      'TB8220L',
      'TB8215',
      'TB8601',
      'TB8230',
    ],
    images: ['/uploads/images/tsarbomba_acc_clasp_1.jpg', '/uploads/images/tsarbomba_acc_clasp_2.jpg'],
    videos: [],
    price: 99.99,
    movement: '',
    caseMaterial: 'Stainless Steel',
    caseSize: '',
    dial: '',
    bracelet: '',
    waterResistance: '',
    shortDescription:
      'A butterfly deployment clasp compatible with Tsar Bomba straps, for a more secure and refined fastening.',
    description:
      'Both clasps are compatible with Tsar Bomba straps. Clasp 1 is designed for a tighter fit on straps originally fitted with a classic buckle (once removed), giving a more secure and refined connection. Clasp 2 is better suited to straps without a buckle.',
    shortDescriptionRu:
      'Застёжка-бабочка, совместимая с ремешками Tsar Bomba, для более надёжной и эстетичной фиксации.',
    shortDescriptionUz:
      "Tsar Bomba tasmalari bilan mos keluvchi capalak qisqich — ishonchli va nafis mahkamlash uchun.",
    descriptionRu:
      'Обе застёжки совместимы с ремешками Tsar Bomba. Застёжка 1 разработана для более плотного прилегания к ремешкам, изначально оснащённым классической пряжкой (после её снятия), что обеспечивает более надёжное и эстетичное соединение. Застёжка 2 лучше подходит для ремешков без пряжки.',
    descriptionUz:
      "Ikkala qisqich ham Tsar Bomba tasmalari bilan mos keladi. 1-qisqich dastlab klassik pryajka bilan jihozlangan tasmalarga (uni olib tashlagandan so'ng) yanada zich o'rnatish uchun mo'ljallangan bo'lib, ishonchli va nafis birlashuvni ta'minlaydi. 2-qisqich esa pryajkasiz tasmalar uchun ko'proq mos keladi.",
    featured: false,
    isNew: false,
    availability: 'in-stock',
  },
  {
    brand: 'Tsar Bomba',
    name: 'Atomic Replacement Bezel',
    reference: 'ATOMIC-BEZEL',
    type: 'accessory',
    compatibleWithRefs: ['TB8222C'],
    images: ['/uploads/images/tsarbomba_acc_atomic_bezel_silver.jpg'],
    videos: [],
    colorLabel: 'Silver',
    colorLabelRu: 'Серебристый',
    colorLabelUz: 'Kumush',
    variants: [
      {
        refSuffix: 'BLACK',
        colorLabel: 'Black',
        colorLabelRu: 'Чёрный',
        colorLabelUz: 'Qora',
        images: ['/uploads/images/tsarbomba_acc_atomic_bezel_black.jpg'],
      },
    ],
    price: 39.99,
    movement: '',
    caseMaterial: 'Stainless Steel',
    caseSize: '',
    dial: '',
    bracelet: '',
    waterResistance: '',
    shortDescription: 'An interchangeable bezel for the Atomic collection, available in stainless steel, carbon fiber, ceramic and more.',
    description:
      'The Atomic replacement bezel lets you completely change the character of your Atomic watch in one move. Available in stainless steel, carbon fiber, ceramic, fluoroelastomer and cubic zirconia, across a wide color palette from classic silver to bold accent tones.',
    shortDescriptionRu:
      'Сменный безель для коллекции Atomic — доступен из нержавеющей стали, карбона, керамики и других материалов.',
    shortDescriptionUz:
      "Atomic kolleksiyasi uchun almashtiriladigan bezel — zanglamas po'lat, karbon, keramika va boshqa materiallarda mavjud.",
    descriptionRu:
      'Атомарный сменный безель позволяет полностью изменить характер часов Atomic одним движением. Доступен из нержавеющей стали, карбонового волокна, керамики, фторэластомера и кубического циркония — в широкой палитре цветов, от классического серебра до ярких оттенков.',
    descriptionUz:
      "Atomic almashtiriladigan bezeli bir harakat bilan soat xarakterini butunlay o'zgartirish imkonini beradi. Zanglamas po'lat, uglerod tolasi, keramika, ftorelastomer va kubik sirkoniydan keng rang palitrasida mavjud — klassik kumushdan tortib yorqin ranglargacha.",
    featured: false,
    isNew: false,
    availability: 'in-stock',
  },
  {
    brand: 'Tsar Bomba',
    name: 'Atomic Replacement Crown',
    reference: 'ATOMIC-CROWN',
    type: 'accessory',
    compatibleWithRefs: ['TB8222C'],
    images: ['/uploads/images/tsarbomba_acc_atomic_crown_black.jpg'],
    videos: [],
    colorLabel: 'Black',
    colorLabelRu: 'Чёрный',
    colorLabelUz: 'Qora',
    variants: [
      {
        refSuffix: 'BLUE',
        colorLabel: 'Blue',
        colorLabelRu: 'Синий',
        colorLabelUz: "Ko'k",
        images: ['/uploads/images/tsarbomba_acc_atomic_crown_blue.jpg'],
      },
    ],
    price: 19.99,
    movement: '',
    caseMaterial: '',
    caseSize: '',
    dial: '',
    bracelet: '',
    waterResistance: '',
    shortDescription: 'A replacement crown for the Atomic collection, available in twelve colors to customize your watch.',
    description:
      'A replacement crown for watches in the Atomic series. A movement component that lets you swap parts to customize the look of your watch, available in twelve colors from classic black to bright yellow.',
    shortDescriptionRu:
      'Сменная заводная головка для коллекции Atomic — доступна в двенадцати цветах для кастомизации часов.',
    shortDescriptionUz:
      "Atomic kolleksiyasi uchun almashtiriladigan zavod boshchasi — soatingizni moslashtirish uchun o'n ikki rangda mavjud.",
    descriptionRu:
      'Сменная коронка (заводная головка) для часов серии Atomic. Компонент часового механизма, позволяющий заменять элементы для кастомизации внешнего вида часов — доступна в двенадцати цветах, от классического чёрного до ярко-жёлтого.',
    descriptionUz:
      "Atomic seriyasidagi soatlar uchun almashtiriladigan zavod boshchasi. Soat ko'rinishini moslashtirish uchun elementlarni almashtirish imkonini beruvchi mexanizm qismi — klassik qoradan yorqin sariqqacha o'n ikki rangda mavjud.",
    featured: false,
    isNew: false,
    availability: 'in-stock',
  },
  {
    brand: 'Tsar Bomba',
    name: 'Atomic Replacement Strap',
    reference: 'ATOMIC-STRAP',
    type: 'accessory',
    compatibleWithRefs: ['TB8222C'],
    images: ['/uploads/images/tsarbomba_acc_atomic_strap_black.jpg'],
    videos: [],
    colorLabel: 'Black',
    colorLabelRu: 'Чёрный',
    colorLabelUz: 'Qora',
    variants: [
      {
        refSuffix: 'LAKEBLUE',
        colorLabel: 'Lake Blue',
        colorLabelRu: 'Голубой',
        colorLabelUz: "Ko'l ko'k",
        images: ['/uploads/images/tsarbomba_acc_atomic_strap_lakeblue.jpg'],
      },
    ],
    price: 99.99,
    movement: '',
    caseMaterial: '',
    caseSize: '',
    dial: '',
    bracelet: 'Quick-release, standard or butterfly clasp',
    waterResistance: '',
    shortDescription: 'A replacement strap for the Atomic collection, offered in over thirty colors with a classic or butterfly clasp.',
    description:
      'A replacement strap for the Atomic collection. Standard straps come fitted with a classic clasp; a premium butterfly deployment clasp is available separately. Offered in over thirty colorways to fully personalize your watch.',
    shortDescriptionRu:
      'Сменный ремешок для коллекции Atomic — более тридцати цветов, с классической или бабочка-застёжкой.',
    shortDescriptionUz:
      "Atomic kolleksiyasi uchun almashtiriladigan tasma — o'ttizdan ortiq rangda, klassik yoki capalak qisqich bilan.",
    descriptionRu:
      'Сменный ремешок Atomic. Стандартные ремешки оснащены классической застёжкой; премиальная застёжка-бабочка доступна отдельно. Более тридцати цветовых вариантов позволяют полностью персонализировать образ часов.',
    descriptionUz:
      "Atomic almashtiriladigan tasmasi. Standart tasmalar klassik qisqich bilan jihozlangan; premium capalak qisqich alohida mavjud. O'ttizdan ortiq rang varianti soat ko'rinishini to'liq shaxsiylashtirish imkonini beradi.",
    featured: false,
    isNew: false,
    availability: 'in-stock',
  },
  {
    brand: 'Tsar Bomba',
    name: 'Reactor Replacement Strap',
    reference: 'TB8213-STRAP',
    type: 'accessory',
    compatibleWithRefs: ['TB8213'],
    images: ['/uploads/images/tsarbomba_acc_reactor_strap_black.jpg'],
    videos: [],
    colorLabel: 'Black',
    colorLabelRu: 'Чёрный',
    colorLabelUz: 'Qora',
    variants: [
      {
        refSuffix: 'RED',
        colorLabel: 'Red',
        colorLabelRu: 'Красный',
        colorLabelUz: 'Qizil',
        images: ['/uploads/images/tsarbomba_acc_reactor_strap_red.jpg'],
      },
    ],
    price: 99.99,
    movement: '',
    caseMaterial: 'FKM Rubber (Fluoroelastomer)',
    caseSize: '',
    dial: '',
    bracelet: 'Standard clasp included; deployment clasp available separately',
    waterResistance: '',
    shortDescription: 'A replacement FKM rubber strap for the Reactor (TB8213), in eight colorways.',
    description:
      'A replacement strap for watches in the Reactor series (TB8213 model), made from FKM rubber (Viton fluoroelastomer). Standard kit includes a classic clasp; a premium deployment clasp is available separately. Eight color options, from black to yellow.',
    shortDescriptionRu:
      'Сменный ремешок из фторкаучука для часов Reactor (TB8213) — восемь цветовых вариантов.',
    shortDescriptionUz:
      "Reactor (TB8213) soati uchun ftorkauchuk almashtiriladigan tasma — sakkiz rang variantida.",
    descriptionRu:
      'Сменный ремешок для часов серии Reactor (модель TB8213), выполненный из фторкаучука (FKM/Viton). Стандартная комплектация включает классическую застёжку; премиальная застёжка-деплой доступна отдельно. Восемь цветовых решений — от чёрного до жёлтого.',
    descriptionUz:
      "Reactor seriyasidagi soatlar (TB8213 modeli) uchun ftorkauchuk (FKM/Viton) dan yasalgan almashtiriladigan tasma. Standart komplektatsiyaga klassik qisqich kiradi; premium deploy qisqich alohida mavjud. Qoradan sariqqacha sakkiz xil rang yechimi.",
    featured: false,
    isNew: false,
    availability: 'in-stock',
  },
  {
    brand: 'Tsar Bomba',
    name: 'Elemental-TB8204Q',
    reference: 'TB8204Q',
    relatedRefs: ['TB8208CF', 'TB8213', 'TB8222C'],
    images: [
      '/uploads/images/tsarbomba_tb8204q_black_red_1.jpg',
      '/uploads/images/tsarbomba_tb8204q_black_red_2.jpg',
      '/uploads/images/tsarbomba_tb8204q_black_red_3.jpg',
    ],
    videos: [],
    colorLabel: 'Black / Red',
    colorLabelRu: 'Чёрный / красный',
    colorLabelUz: 'Qora / qizil',
    variants: [
      {
        colorLabel: 'Gold / Black',
        colorLabelRu: 'Золотой / чёрный',
        colorLabelUz: 'Oltin / qora',
        images: [
          '/uploads/images/tsarbomba_tb8204q_gold_black_1.jpg',
          '/uploads/images/tsarbomba_tb8204q_gold_black_2.jpg',
          '/uploads/images/tsarbomba_tb8204q_gold_black_3.jpg',
        ],
      },
      {
        colorLabel: 'Gold / Blue',
        colorLabelRu: 'Золотой / синий',
        colorLabelUz: "Oltin / ko'k",
        images: [
          '/uploads/images/tsarbomba_tb8204q_gold_blue_1.jpg',
          '/uploads/images/tsarbomba_tb8204q_gold_blue_2.jpg',
          '/uploads/images/tsarbomba_tb8204q_gold_blue_3.jpg',
        ],
      },
      {
        colorLabel: 'Black / Green',
        colorLabelRu: 'Чёрный / зелёный',
        colorLabelUz: 'Qora / yashil',
        images: [
          '/uploads/images/tsarbomba_tb8204q_black_green_1.jpg',
          '/uploads/images/tsarbomba_tb8204q_black_green_2.jpg',
          '/uploads/images/tsarbomba_tb8204q_black_green_3.jpg',
        ],
      },
      {
        colorLabel: 'Black / Yellow',
        colorLabelRu: 'Чёрный / жёлтый',
        colorLabelUz: 'Qora / sariq',
        images: [
          '/uploads/images/tsarbomba_tb8204q_black_yellow_1.jpg',
          '/uploads/images/tsarbomba_tb8204q_black_yellow_2.jpg',
          '/uploads/images/tsarbomba_tb8204q_black_yellow_3.jpg',
        ],
      },
      {
        colorLabel: 'Black / Olive',
        colorLabelRu: 'Чёрный / оливковый',
        colorLabelUz: 'Qora / zaytun',
        images: [
          '/uploads/images/tsarbomba_tb8204q_black_olive_1.jpg',
          '/uploads/images/tsarbomba_tb8204q_black_olive_2.jpg',
          '/uploads/images/tsarbomba_tb8204q_black_olive_3.jpg',
        ],
      },
      {
        colorLabel: 'Black / Blue',
        colorLabelRu: 'Чёрный / синий',
        colorLabelUz: "Qora / ko'k",
        images: [
          '/uploads/images/tsarbomba_tb8204q_black_blue_1.jpg',
          '/uploads/images/tsarbomba_tb8204q_black_blue_2.jpg',
          '/uploads/images/tsarbomba_tb8204q_black_blue_3.jpg',
        ],
      },
      {
        colorLabel: 'Silver / Orange',
        colorLabelRu: 'Серебристый / оранжевый',
        colorLabelUz: "Kumush / to'q sariq",
        images: [
          '/uploads/images/tsarbomba_tb8204q_silver_orange_1.jpg',
          '/uploads/images/tsarbomba_tb8204q_silver_orange_2.jpg',
          '/uploads/images/tsarbomba_tb8204q_silver_orange_3.jpg',
        ],
      },
      {
        colorLabel: 'Black / Orange',
        colorLabelRu: 'Чёрный / оранжевый',
        colorLabelUz: "Qora / to'q sariq",
        images: [
          '/uploads/images/tsarbomba_tb8204q_black_orange_1.jpg',
          '/uploads/images/tsarbomba_tb8204q_black_orange_2.jpg',
          '/uploads/images/tsarbomba_tb8204q_black_orange_3.jpg',
        ],
      },
      {
        colorLabel: 'Silver / Black',
        colorLabelRu: 'Серебристый / чёрный',
        colorLabelUz: 'Kumush / qora',
        images: [
          '/uploads/images/tsarbomba_tb8204q_silver_black_1.jpg',
          '/uploads/images/tsarbomba_tb8204q_silver_black_2.jpg',
          '/uploads/images/tsarbomba_tb8204q_silver_black_3.jpg',
        ],
      },
      {
        colorLabel: 'Silver / Blue',
        colorLabelRu: 'Серебристый / синий',
        colorLabelUz: "Kumush / ko'k",
        images: [
          '/uploads/images/tsarbomba_tb8204q_silver_blue_1.jpg',
          '/uploads/images/tsarbomba_tb8204q_silver_blue_2.jpg',
          '/uploads/images/tsarbomba_tb8204q_silver_blue_3.jpg',
        ],
      },
      {
        colorLabel: 'Silver / Red',
        colorLabelRu: 'Серебристый / красный',
        colorLabelUz: 'Kumush / qizil',
        images: [
          '/uploads/images/tsarbomba_tb8204q_silver_red_1.jpg',
          '/uploads/images/tsarbomba_tb8204q_silver_red_2.jpg',
          '/uploads/images/tsarbomba_tb8204q_silver_red_3.jpg',
        ],
      },
      {
        colorLabel: 'Light Blue',
        colorLabelRu: 'Голубой',
        colorLabelUz: "Ochiq ko'k",
        images: [
          '/uploads/images/tsarbomba_tb8204q_light_blue_1.jpg',
          '/uploads/images/tsarbomba_tb8204q_light_blue_2.jpg',
          '/uploads/images/tsarbomba_tb8204q_light_blue_3.jpg',
        ],
      },
    ],
    price: 210.9,
    movement: 'Seiko, Quartz',
    caseMaterial: 'Stainless Steel 316L',
    caseSize: '43 × 50.5 × 15.5mm',
    dial: '',
    bracelet: '',
    waterResistance: '5 ATM / 50m',
    shortDescription: 'The flagship Elemental chronograph, in twelve real colorways from gold to olive.',
    shortDescriptionRu: 'Флагманский хронограф линии Elemental — двенадцать реальных цветовых решений от золотого до оливкового.',
    shortDescriptionUz: "Elemental liniyasining bosh xronografi — oltindan zaytungacha o'n ikki xil real rang yechimi.",
    descriptionRu:
      'Флагманская модель линии Elemental. Кварцевый механизм Seiko, корпус 43 × 50,5 × 15,5 мм из нержавеющей стали 316L, доступен в двенадцати цветовых решениях — от золотого и серебристого до оливкового и голубого.',
    descriptionUz:
      "Elemental liniyasining bosh modeli. Seiko kvarts mexanizmi, 43 × 50.5 × 15.5mm o'lchamdagi 316L zanglamas po'lat korpus, oltin va kumushdan zaytun va ko'kgacha o'n ikki xil rangda mavjud.",
    featured: true,
    isNew: false,
    availability: 'sold',
  },
  {
    brand: 'Tsar Bomba',
    name: 'Nucleus Femme 02',
    reference: 'TB8219',
    relatedRefs: ['TB8215', 'TB8220L', 'TB8231L'],
    images: [
      '/uploads/images/tsarbomba_tb8219_sky_blue_1.jpg',
      '/uploads/images/tsarbomba_tb8219_sky_blue_2.jpg',
      '/uploads/images/tsarbomba_tb8219_sky_blue_3.jpg',
    ],
    videos: [],
    colorLabel: 'Sky Blue',
    colorLabelRu: 'Небесно-голубой',
    colorLabelUz: "Osmon ko'k",
    variants: [
      {
        colorLabel: 'Pink',
        colorLabelRu: 'Розовый',
        colorLabelUz: 'Pushti',
        images: [
          '/uploads/images/tsarbomba_tb8219_pink_1.jpg',
          '/uploads/images/tsarbomba_tb8219_pink_2.jpg',
          '/uploads/images/tsarbomba_tb8219_pink_3.jpg',
        ],
      },
      {
        colorLabel: 'White',
        colorLabelRu: 'Белый',
        colorLabelUz: 'Oq',
        images: [
          '/uploads/images/tsarbomba_tb8219_white_1.jpg',
          '/uploads/images/tsarbomba_tb8219_white_2.jpg',
          '/uploads/images/tsarbomba_tb8219_white_3.jpg',
        ],
      },
      {
        colorLabel: 'Green',
        colorLabelRu: 'Зелёный',
        colorLabelUz: 'Yashil',
        images: [
          '/uploads/images/tsarbomba_tb8219_green_1.jpg',
          '/uploads/images/tsarbomba_tb8219_green_2.jpg',
          '/uploads/images/tsarbomba_tb8219_green_3.jpg',
        ],
      },
      {
        colorLabel: 'Jade Green',
        colorLabelRu: 'Нефритовый',
        colorLabelUz: 'Yashma yashil',
        images: [
          '/uploads/images/tsarbomba_tb8219_jade_green_1.jpg',
          '/uploads/images/tsarbomba_tb8219_jade_green_2.jpg',
          '/uploads/images/tsarbomba_tb8219_jade_green_3.jpg',
        ],
      },
      {
        colorLabel: 'Smoke Grey',
        colorLabelRu: 'Дымчато-серый',
        colorLabelUz: "Tutunsimon kulrang",
        images: [
          '/uploads/images/tsarbomba_tb8219_smoke_grey_1.jpg',
          '/uploads/images/tsarbomba_tb8219_smoke_grey_2.jpg',
          '/uploads/images/tsarbomba_tb8219_smoke_grey_3.jpg',
        ],
      },
    ],
    price: 287.86,
    movement: 'Swiss Ronda, Quartz',
    caseMaterial: 'Transparent resin case, cubic zirconia bezel',
    caseSize: '',
    dial: 'Stained-glass mosaic dial, cubic zirconia surround',
    bracelet: 'Silicone strap',
    waterResistance: '',
    shortDescription: 'A jewel-toned mosaic dial in a transparent case, in six colorways.',
    shortDescriptionRu: 'Циферблат-мозаика в драгоценных тонах в прозрачном корпусе — шесть цветовых решений.',
    shortDescriptionUz: "Shaffof korpusdagi zebo-ziynatli mozaik sirtqi taxta — olti xil rangda.",
    descriptionRu:
      'Второй Nucleus Femme — циферблат-витраж в прозрачном корпусе, инкрустированном кубическим цирконием, на силиконовом ремешке. Кварцевый механизм Swiss Ronda. Шесть цветовых решений: небесно-голубой, розовый, белый, зелёный, нефритовый и дымчато-серый.',
    descriptionUz:
      "Ikkinchi Nucleus Femme — kubik sirkoniy bilan bezatilgan shaffof korpusdagi vitraj sirtqi taxta, silikon tasma bilan. Swiss Ronda kvarts mexanizmi. Olti xil rang: osmon ko'k, pushti, oq, yashil, yashma yashil va tutunsimon kulrang.",
    featured: false,
    isNew: false,
    availability: 'sold',
  },
  {
    brand: 'Tsar Bomba',
    name: 'Reactor Replacement Bezel',
    reference: 'TB8213-BEZEL',
    type: 'accessory',
    compatibleWithRefs: ['TB8213'],
    images: ['/uploads/images/tsarbomba_acc_reactor_bezel_black.jpg'],
    videos: [],
    colorLabel: 'Black',
    colorLabelRu: 'Чёрный',
    colorLabelUz: 'Qora',
    variants: [
      {
        colorLabel: 'Silver',
        colorLabelRu: 'Серебристый',
        colorLabelUz: 'Kumush',
        images: ['/uploads/images/tsarbomba_acc_reactor_bezel_silver.jpg'],
      },
    ],
    price: 79.99,
    movement: '',
    caseMaterial: 'Stainless Steel',
    caseSize: '',
    dial: '',
    bracelet: '',
    waterResistance: '',
    shortDescription: 'A replacement quick-detach bezel for the Reactor (TB8213).',
    shortDescriptionRu: 'Сменный быстросъёмный безель для часов Reactor (TB8213).',
    shortDescriptionUz: "Reactor (TB8213) uchun tezkor almashtiriladigan bezel.",
    descriptionRu:
      'Сменный безель для часов серии Reactor (модель TB8213), совместимый с системой быстрой замены.',
    descriptionUz:
      "Reactor seriyasidagi soatlar (TB8213 modeli) uchun tezkor almashtirish tizimiga mos bezel.",
    featured: false,
    isNew: false,
    availability: 'in-stock',
  },
  {
    brand: 'Tsar Bomba',
    name: 'Reactor Replacement Crown',
    reference: 'TB8213-CROWN',
    type: 'accessory',
    compatibleWithRefs: ['TB8213'],
    images: ['/uploads/images/tsarbomba_acc_reactor_crown_black.jpg'],
    videos: [],
    colorLabel: 'Black',
    colorLabelRu: 'Чёрный',
    colorLabelUz: 'Qora',
    variants: [
      {
        colorLabel: 'Silver / Orange',
        colorLabelRu: 'Серебристый / оранжевый',
        colorLabelUz: "Kumush / to'q sariq",
        images: ['/uploads/images/tsarbomba_acc_reactor_crown_silver_orange.jpg'],
      },
    ],
    price: 39.99,
    movement: '',
    caseMaterial: 'Stainless Steel',
    caseSize: '',
    dial: '',
    bracelet: '',
    waterResistance: '',
    shortDescription: 'A replacement crown for the Reactor (TB8213).',
    shortDescriptionRu: 'Сменная заводная головка для часов Reactor (TB8213).',
    shortDescriptionUz: "Reactor (TB8213) uchun almashtiriladigan zavod boshchasi.",
    descriptionRu: 'Сменная заводная головка для часов серии Reactor (модель TB8213).',
    descriptionUz: "Reactor seriyasidagi soatlar (TB8213 modeli) uchun almashtiriladigan zavod boshchasi.",
    featured: false,
    isNew: false,
    availability: 'in-stock',
  },
  {
    brand: 'Tsar Bomba',
    name: 'Dark Matter 4',
    reference: 'TB8604',
    relatedRefs: ['TB8601', 'TB8602', 'TB8603', 'TB8222C'],
    images: [
      '/uploads/images/tsarbomba_tb8604_black_1.jpg',
      '/uploads/images/tsarbomba_tb8604_black_2.jpg',
      '/uploads/images/tsarbomba_tb8604_black_3.jpg',
    ],
    videos: [],
    colorLabel: 'Black',
    colorLabelRu: 'Чёрный',
    colorLabelUz: 'Qora',
    variants: [
      {
        colorLabel: 'Black / Blue',
        colorLabelRu: 'Чёрный / синий',
        colorLabelUz: "Qora / ko'k",
        images: [
          '/uploads/images/tsarbomba_tb8604_black_blue_1.jpg',
          '/uploads/images/tsarbomba_tb8604_black_blue_2.jpg',
          '/uploads/images/tsarbomba_tb8604_black_blue_3.jpg',
        ],
      },
      {
        colorLabel: 'Black / Green',
        colorLabelRu: 'Чёрный / зелёный',
        colorLabelUz: 'Qora / yashil',
        images: [
          '/uploads/images/tsarbomba_tb8604_black_green_1.jpg',
          '/uploads/images/tsarbomba_tb8604_black_green_2.jpg',
          '/uploads/images/tsarbomba_tb8604_black_green_3.jpg',
        ],
      },
      {
        colorLabel: 'Black / Orange',
        colorLabelRu: 'Чёрный / оранжевый',
        colorLabelUz: "Qora / to'q sariq",
        images: [
          '/uploads/images/tsarbomba_tb8604_black_orange_1.jpg',
          '/uploads/images/tsarbomba_tb8604_black_orange_2.jpg',
          '/uploads/images/tsarbomba_tb8604_black_orange_3.jpg',
        ],
      },
      {
        colorLabel: 'Black / Red',
        colorLabelRu: 'Чёрный / красный',
        colorLabelUz: 'Qora / qizil',
        images: [
          '/uploads/images/tsarbomba_tb8604_black_red_1.jpg',
          '/uploads/images/tsarbomba_tb8604_black_red_2.jpg',
          '/uploads/images/tsarbomba_tb8604_black_red_3.jpg',
        ],
      },
    ],
    price: 4792.24,
    movement: 'Miyota, Automatic',
    caseMaterial: 'Stainless Steel 316L, Carbon Fiber Bezel',
    caseSize: '43 × 53.5 × 14.5mm',
    dial: 'Skeletonized, interchangeable components',
    bracelet: 'FKM rubber, quick-release, 26mm',
    waterResistance: '5 ATM / 50m',
    shortDescription: 'The fourth Dark Matter interchangeable set, in five skeletonized colorways.',
    shortDescriptionRu: 'Четвёртый комплект Dark Matter — скелетонированные часы в пяти цветовых решениях.',
    shortDescriptionUz: "Dark Matter to'plamining to'rtinchi varianti — besh xil rangdagi skelet soat.",
    descriptionRu:
      'Четвёртый интерчейнджбл-комплект коллекции Dark Matter — скелетонированный автоматический корпус, доступный в чёрном, чёрно-синем, чёрно-зелёном, чёрно-оранжевом и чёрно-красном исполнении.',
    descriptionUz:
      "Dark Matter kolleksiyasining to'rtinchi almashtiriladigan to'plami — qora, qora-ko'k, qora-yashil, qora-to'q sariq va qora-qizil variantlarida mavjud skelet avtomatik korpus.",
    featured: false,
    isNew: true,
    availability: 'sold',
  },
];



export const COLLECTIONS_I18N: Record<string, { name: { ru: string; uz: string }; description: { ru: string; uz: string } }> = {
  'heritage-icons': {
    name: { ru: 'Иконы наследия', uz: 'Meros ikonalari' },
    description: {
      ru: 'Часы, определившие свои категории и остающиеся эталоном спустя десятилетия.',
      uz: "O'z toifalarini belgilab bergan va o'n yilliklar o'tsa ham andoza bo'lib qolayotgan soatlar.",
    },
  },
  'new-arrivals': {
    name: { ru: 'Новые поступления', uz: 'Yangi kelganlar' },
    description: {
      ru: 'Последние часы, поступившие в SwissWatch, недавно проверенные на подлинность и каталогизированные.',
      uz: "SwissWatch'ga yaqinda kelib tushgan, haqiqiyligi tasdiqlangan va katalogga kiritilgan soatlar.",
    },
  },
};

async function seed() {
  await connectDatabase();

  console.log('[seed] clearing existing collections...');
  await Promise.all([
    Admin.deleteMany({}),
    Brand.deleteMany({}),
    Category.deleteMany({}),
    Watch.deleteMany({}),
    Collection.deleteMany({}),
  ]);

  console.log('[seed] creating admin user...');
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'azamjonbro@gmail.com';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'SwissWatch2026!';
  await Admin.create({
    name: 'SwissWatch Admin',
    email: adminEmail,
    password: adminPassword,
    role: 'superadmin',
  });

  console.log('[seed] creating brands & categories...');
  const brandDocs: Record<string, InstanceType<typeof Brand>> = {};
  const categoryDocs: Record<string, InstanceType<typeof Category>> = {};

  for (let i = 0; i < BRANDS.length; i += 1) {
    const b = BRANDS[i];
    const slug = toSlug(b.name);

    let logoImg = img(`${slug}-logo`, b.name);
    if (b.name === 'Tsar Bomba') logoImg = '/uploads/images/tsar_bomba_logo.jpg';
    else if (b.name === 'Rolex') logoImg = '/uploads/images/logo_rolex.jpg';
    else if (b.name === 'Patek Philippe') logoImg = '/uploads/images/logo_patek.jpg';
    else if (b.name === 'Audemars Piguet') logoImg = '/uploads/images/logo_ap.jpg';
    else if (b.name === 'Vacheron Constantin') logoImg = '/uploads/images/logo_vacheron.jpg';

    const brand = await Brand.create({
      name: b.name,
      slug,
      description: b.description,
      logo: logoImg,
      image: logoImg,
      website: `https://www.${slug.replace(/-/g, '')}.com`,
      country: 'Switzerland',
      founded: b.founded,
      featured: i < 4,
      isActive: true,
      translations: {
        ru: { description: b.descriptionRu },
        uz: { description: b.descriptionUz },
      },
    });
    brandDocs[b.name] = brand;

    const category = await Category.create({
      name: b.name,
      slug,
      tagline: b.tagline,
      description: b.description,
      image: categoryPlaceholder(`${slug}-category`, b.name),
      video: '',
      order: i,
      featured: i < 3,
      isActive: true,
      translations: {
        ru: { description: b.descriptionRu, tagline: b.taglineRu },
        uz: { description: b.descriptionUz, tagline: b.taglineUz },
      },
    });
    categoryDocs[b.name] = category;
  }

  console.log('[seed] creating watches...');
  const watchDocs: InstanceType<typeof Watch>[] = [];
  const watchByRef: Record<string, InstanceType<typeof Watch>> = {};

  for (const w of WATCHES) {
    // The entry's own images/videos are "variant zero" — combined with any
    // additional colourways into one product's variants[], so the storefront
    // switches colour in place instead of navigating to a different product.
    const primaryVariant: WatchColorVariant = {
      colorLabel: w.colorLabel ?? '',
      colorLabelRu: w.colorLabelRu ?? '',
      colorLabelUz: w.colorLabelUz ?? '',
      images: w.images ?? (w.image ? [w.image] : []),
      videos: w.videos ?? [],
    };
    const allVariants = [primaryVariant, ...(w.variants ?? [])];
    const usedSlugs = new Set<string>();
    const variants = allVariants.map((variant) => {
      let colorSlug = toSlug(variant.colorLabel || 'default') || 'default';
      while (usedSlugs.has(colorSlug)) colorSlug = `${colorSlug}-2`;
      usedSlugs.add(colorSlug);
      return {
        colorSlug,
        colorLabel: variant.colorLabel ?? '',
        colorLabelRu: variant.colorLabelRu,
        colorLabelUz: variant.colorLabelUz,
        images: variant.images.length ? variant.images : [watchProductPlaceholder(`${w.reference}-${colorSlug}`, w.name)],
        videos: variant.videos ?? [],
      };
    });

    const slug = toSlug(`${w.brand}-${w.name}-${w.reference}`);
    const watch = await Watch.create({
      brand: brandDocs[w.brand]._id,
      category: categoryDocs[w.brand]._id,
      name: w.name,
      slug,
      reference: w.reference,
      price: w.price,
      currency: 'USD',
      type: w.type ?? 'watch',
      description:
        w.description ??
        `${w.shortDescription} Crafted with ${w.movement.toLowerCase()}, housed in a ${w.caseSize} ${w.caseMaterial.toLowerCase()} case, and finished with a ${w.dial.toLowerCase()} dial.`,
      shortDescription: w.shortDescription,
      variants,
      movement: w.movement,
      caseMaterial: w.caseMaterial,
      caseSize: w.caseSize,
      dial: w.dial,
      bracelet: w.bracelet,
      waterResistance: w.waterResistance,
      availability: w.availability ?? 'in-stock',
      featured: w.featured,
      isNewArrival: w.isNew,
      isActive: true,
      translations: {
        ru: { shortDescription: w.shortDescriptionRu, description: w.descriptionRu },
        uz: { shortDescription: w.shortDescriptionUz, description: w.descriptionUz },
      },
    });
    watchDocs.push(watch);
    watchByRef[w.reference] = watch;
  }

  console.log('[seed] linking accessories & related products...');
  for (const w of WATCHES) {
    const watch = watchByRef[w.reference];
    const updates: Record<string, unknown> = {};
    if (w.compatibleWithRefs?.length) {
      updates.compatibleWith = w.compatibleWithRefs.map((ref) => watchByRef[ref]?._id).filter(Boolean);
    }
    if (w.relatedRefs?.length) {
      updates.relatedWatches = w.relatedRefs.map((ref) => watchByRef[ref]?._id).filter(Boolean);
    }
    if (Object.keys(updates).length) await Watch.updateOne({ _id: watch._id }, updates);
  }

  console.log('[seed] creating collections...');
  await Collection.create({
    name: 'Heritage Icons',
    slug: 'heritage-icons',
    description: 'Timepieces that defined their categories and remain the benchmark decades later.',
    image: categoryPlaceholder('heritage-icons', 'Heritage Icons'),
    watches: watchDocs.filter((w) => w.featured).map((w) => w._id),
    featured: true,
    isActive: true,
    translations: {
      ru: { name: COLLECTIONS_I18N['heritage-icons'].name.ru, description: COLLECTIONS_I18N['heritage-icons'].description.ru },
      uz: { name: COLLECTIONS_I18N['heritage-icons'].name.uz, description: COLLECTIONS_I18N['heritage-icons'].description.uz },
    },
  });

  await Collection.create({
    name: 'New Arrivals',
    slug: 'new-arrivals',
    description: 'The latest timepieces to arrive at SwissWatch, freshly authenticated and catalogued.',
    image: categoryPlaceholder('new-arrivals', 'New Arrivals'),
    watches: watchDocs.filter((w) => w.isNew).map((w) => w._id),
    featured: false,
    isActive: true,
    translations: {
      ru: { name: COLLECTIONS_I18N['new-arrivals'].name.ru, description: COLLECTIONS_I18N['new-arrivals'].description.ru },
      uz: { name: COLLECTIONS_I18N['new-arrivals'].name.uz, description: COLLECTIONS_I18N['new-arrivals'].description.uz },
    },
  });

  console.log('[seed] done.');
  console.log(`[seed] admin login -> email: ${adminEmail} / password: ${adminPassword}`);

  await mongoose.disconnect();
  process.exit(0);
}

if (require.main === module) {
  seed().catch((err) => {
    console.error('[seed] failed', err);
    process.exit(1);
  });
}
