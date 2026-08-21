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

export const WATCHES = [
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
    reference: 'TB8208A',
    image: '/images/tsarbomba_tb8208.jpg',
    price: 499,
    movement: 'Automatic, Miyota 82S0',
    caseMaterial: 'Stainless Steel',
    caseSize: '43.5mm',
    dial: 'Skeletonized',
    bracelet: 'Silicone strap',
    waterResistance: '50m',
    shortDescription: 'Striking tonneau-shaped automatic skeleton watch with a bold aesthetic.',
    shortDescriptionRu: 'Эффектные автоматические скелетон-часы бочкообразной формы со смелой эстетикой.',
    shortDescriptionUz: "Jasur estetikaga ega, bochkasimon shakldagi ta'sirchan avtomatik skelet soat.",
    descriptionRu:
      'Эффектные автоматические скелетон-часы бочкообразной формы со смелой эстетикой. Оснащены автоматическим механизмом Miyota 82S0, заключены в корпус 43,5 мм из нержавеющей стали и дополнены скелетонированным циферблатом.',
    descriptionUz:
      "Jasur estetikaga ega, bochkasimon shakldagi ta'sirchan avtomatik skelet soat. Avtomatik Miyota 82S0 mexanizmi bilan jihozlangan, 43.5mm o'lchamdagi zanglamas po'lat korpusda joylashgan va skelet sirtqi taxta bilan yakunlangan.",
    featured: true,
    isNew: true,
  },
  {
    brand: 'Tsar Bomba',
    name: 'TB8204',
    reference: 'TB8204Q',
    image: '/images/tsarbomba_tb8204.jpg',
    price: 299,
    movement: 'Quartz Chronograph',
    caseMaterial: 'Carbon Fiber',
    caseSize: '43.5mm',
    dial: 'Black and Red Skeletonized',
    bracelet: 'Silicone strap',
    waterResistance: '50m',
    shortDescription: 'A dynamic carbon fiber chronograph blending motorsport inspiration with futuristic design.',
    shortDescriptionRu:
      'Динамичный хронограф из углеродного волокна, сочетающий вдохновение автоспортом с футуристическим дизайном.',
    shortDescriptionUz:
      "Avtosportdan ilhomlangan va futuristik dizaynni birlashtirgan dinamik uglerod tolali xronograf.",
    descriptionRu:
      'Динамичный хронограф из углеродного волокна, сочетающий вдохновение автоспортом с футуристическим дизайном. Оснащены кварцевым хронографом, заключены в корпус 43,5 мм из карбонового волокна и дополнены чёрно-красным скелетонированным циферблатом.',
    descriptionUz:
      "Avtosportdan ilhomlangan va futuristik dizaynni birlashtirgan dinamik uglerod tolali xronograf. Kvarts xronograf mexanizmi bilan jihozlangan, 43.5mm o'lchamdagi uglerod tolasi korpusda joylashgan va qora-qizil skelet sirtqi taxta bilan yakunlangan.",
    featured: true,
    isNew: true,
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
    if (b.name === 'Tsar Bomba') logoImg = '/images/tsar_bomba_logo.jpg';
    else if (b.name === 'Rolex') logoImg = '/images/logo_rolex.jpg';
    else if (b.name === 'Patek Philippe') logoImg = '/images/logo_patek.jpg';
    else if (b.name === 'Audemars Piguet') logoImg = '/images/logo_ap.jpg';
    else if (b.name === 'Vacheron Constantin') logoImg = '/images/logo_vacheron.jpg';

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
  for (const w of WATCHES) {
    const slug = toSlug(`${w.brand}-${w.name}-${w.reference}`);

    const watch = await Watch.create({
      brand: brandDocs[w.brand]._id,
      category: categoryDocs[w.brand]._id,
      name: w.name,
      slug,
      reference: w.reference,
      price: w.price,
      currency: 'USD',
      description: `${w.shortDescription} Crafted with ${w.movement.toLowerCase()}, housed in a ${w.caseSize} ${w.caseMaterial.toLowerCase()} case, and finished with a ${w.dial.toLowerCase()} dial.`,
      shortDescription: w.shortDescription,
      images: [w.image ?? watchProductPlaceholder(slug, w.name)],
      videos: [],
      movement: w.movement,
      caseMaterial: w.caseMaterial,
      caseSize: w.caseSize,
      dial: w.dial,
      bracelet: w.bracelet,
      waterResistance: w.waterResistance,
      availability: 'in-stock',
      featured: w.featured,
      isNewArrival: w.isNew,
      isActive: true,
      translations: {
        ru: { shortDescription: w.shortDescriptionRu, description: w.descriptionRu },
        uz: { shortDescription: w.shortDescriptionUz, description: w.descriptionUz },
      },
    });
    watchDocs.push(watch);
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
