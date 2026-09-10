/**
 * Fills the FAQ list with the ten questions the shop is actually asked.
 *
 * This is the shop's own copy, supplied by the business on 2026-09-10 and
 * written out in all three languages the storefront speaks. The answers
 * deliberately commit to nothing the business has not confirmed — no delivery
 * window, no returns period, no named payment method — because the manager
 * settles those per order, and an answer that is wrong is worse than one that
 * is general. Every entry stays editable in the admin panel.
 *
 * Idempotent: a question already in the database, matched on its English text,
 * is left exactly as it is — re-running this never overwrites an edited answer.
 *
 *     npm run seed:faqs            # report what would be inserted
 *     npm run seed:faqs -- --apply
 */
import mongoose from 'mongoose';
import { connectDatabase } from '../config/db';
import { Faq } from '../models/Faq';

interface SeedFaq {
  question: string;
  answer: string;
  ru: { question: string; answer: string };
  uz: { question: string; answer: string };
}

const FAQS: SeedFaq[] = [
  {
    question: 'Are the watches at SwissWatch Premium authentic?',
    answer:
      'Yes. Everything offered at SwissWatch Premium is authentic and arrives through trusted, official supply channels. Each piece is handed over with its set and the documents that came with it.',
    ru: {
      question: 'Оригинальные ли часы в SwissWatch Premium?',
      answer:
        'Да. Все товары, представленные в SwissWatch Premium, оригинальные и поступают через надёжные официальные каналы поставок. Каждая модель передаётся с соответствующей комплектацией и имеющимися документами.',
    },
    uz: {
      question: 'SwissWatch Premium’dagi soatlar originalmi?',
      answer:
        'Ha. SwissWatch Premium’da taqdim etiladigan mahsulotlar original bo‘lib, ishonchli va rasmiy yetkazib berish manbalari orqali olib kelinadi. Har bir mahsulot tegishli komplektatsiyasi va mavjud hujjatlari bilan taqdim etiladi.',
    },
  },
  {
    question: 'Is the watch sold with a warranty?',
    answer:
      'Yes. Depending on the brand and the model, a watch is sold with a warranty period set by the manufacturer or by the seller. The exact term is shown on the product page or confirmed at the time of purchase.',
    ru: {
      question: 'Предоставляется ли гарантия на часы?',
      answer:
        'Да. В зависимости от бренда и модели часы продаются с гарантийным сроком, установленным производителем или продавцом. Точный срок указывается на странице товара или подтверждается при покупке.',
    },
    uz: {
      question: 'Soatga kafolat beriladimi?',
      answer:
        'Ha. Soatlar brend va modelga qarab ishlab chiqaruvchi yoki sotuvchi tomonidan belgilangan kafolat muddati bilan sotiladi. Aniq kafolat muddati mahsulot sahifasida yoki xarid vaqtida ko‘rsatiladi.',
    },
  },
  {
    question: 'How do I place an order through the site?',
    answer:
      'Choose the piece you want, press the order button and leave your contact details. Our manager will get in touch and confirm availability, payment and the delivery arrangements.',
    ru: {
      question: 'Как оформить заказ через сайт?',
      answer:
        'Выберите нужную модель, нажмите кнопку заказа и оставьте свои контактные данные. Наш менеджер свяжется с вами и подтвердит наличие, оплату и детали доставки.',
    },
    uz: {
      question: 'Sayt orqali qanday qilib buyurtma beraman?',
      answer:
        'Kerakli mahsulotni tanlab, buyurtma berish tugmasini bosing va aloqa ma’lumotlaringizni kiriting. Menejerimiz siz bilan bog‘lanib, mahsulot mavjudligi, to‘lov va yetkazib berish tafsilotlarini tasdiqlaydi.',
    },
  },
  {
    question: 'Are the pieces on the site also available in the boutique?',
    answer:
      'Availability differs from one boutique to another. Before you buy, leave a request on the site or ask our manager which branch currently holds the piece.',
    ru: {
      question: 'Есть ли товары с сайта в магазине?',
      answer:
        'Наличие может отличаться в разных филиалах. Перед покупкой оставьте запрос на сайте или уточните у менеджера, в каком именно филиале есть нужная модель.',
    },
    uz: {
      question: 'Saytdagi mahsulotlar do‘konda ham mavjudmi?',
      answer:
        'Mahsulot mavjudligi filiallar bo‘yicha farq qilishi mumkin. Xarid qilishdan oldin sayt orqali so‘rov qoldirishingiz yoki menejerimiz orqali aynan qaysi filialda mavjudligini aniqlashingiz mumkin.',
    },
  },
  {
    question: 'Do you deliver across Uzbekistan?',
    answer:
      'Yes. Delivery is available anywhere in Uzbekistan. The time it takes and what it costs depend on the address and on the kind of order.',
    ru: {
      question: 'Есть ли доставка по Узбекистану?',
      answer:
        'Да. Доставка осуществляется по всему Узбекистану. Срок и стоимость зависят от адреса и типа заказа.',
    },
    uz: {
      question: 'O‘zbekiston bo‘ylab yetkazib berish bormi?',
      answer:
        'Ha. O‘zbekiston bo‘ylab yetkazib berish xizmati mavjud. Yetkazib berish muddati va narxi manzil hamda buyurtma turiga qarab aniqlanadi.',
    },
  },
  {
    question: 'Can I inspect the watch before accepting delivery?',
    answer:
      'Depending on the delivery method, you can check the outward condition and the contents of the set when you receive it. The manager explains the exact terms when your order is confirmed.',
    ru: {
      question: 'Можно ли проверить товар перед получением?',
      answer:
        'В зависимости от способа доставки вы можете проверить внешнее состояние и комплектацию при получении. Точные условия менеджер разъясняет при подтверждении заказа.',
    },
    uz: {
      question: 'Mahsulotni yetkazib berishdan oldin tekshirib olsam bo‘ladimi?',
      answer:
        'Yetkazib berish usuliga qarab mahsulotni qabul qilish vaqtida tashqi holati va komplektatsiyasini tekshirish imkoniyati mavjud. Batafsil shartlarni buyurtmani tasdiqlash vaqtida menejerimiz tushuntirib beradi.',
    },
  },
  {
    question: 'What payment methods are available?',
    answer:
      'You can pay by any of the methods we accept. Which ones apply depends on the kind of order, and the manager states them exactly when the order is confirmed.',
    ru: {
      question: 'Какие способы оплаты доступны?',
      answer:
        'Оплатить можно одним из доступных способов. Формы оплаты могут различаться в зависимости от типа заказа и точно указываются менеджером при подтверждении заказа.',
    },
    uz: {
      question: 'Qanday to‘lov usullari mavjud?',
      answer:
        'To‘lovni mavjud usullardan biri orqali amalga oshirishingiz mumkin. To‘lov shakllari buyurtma turiga qarab farq qilishi mumkin va menejer tomonidan buyurtma tasdiqlanishida aniq ko‘rsatiladi.',
    },
  },
  {
    question: 'How do I know the watch will be the right size for me?',
    answer:
      'The product page lists the case diameter and the main measurements. If you are hesitating between options, our specialists will help you choose the one that suits your wrist and your style.',
    ru: {
      question: 'Как понять, подойдёт ли мне размер часов?',
      answer:
        'На странице товара указаны диаметр корпуса и основные размеры. Если вы сомневаетесь в выборе, наши специалисты помогут подобрать вариант под ваше запястье и стиль.',
    },
    uz: {
      question: 'Soat o‘lchami menga mos kelishini qanday bilaman?',
      answer:
        'Mahsulot sahifasida korpus diametri va asosiy o‘lchamlari ko‘rsatiladi. Agar tanlashda ikkilanayotgan bo‘lsangiz, mutaxassislarimiz bilagingiz va uslubingizga mos variantni tanlashda yordam beradi.',
    },
  },
  {
    question: 'Can the watch be wrapped as a gift?',
    answer:
      'Yes. Within what is available, we will prepare the piece as a gift and help with special wrapping. Just mention it to the manager when you order.',
    ru: {
      question: 'Можно ли оформить подарочную упаковку?',
      answer:
        'Да. В рамках имеющихся возможностей мы поможем подготовить модель как подарок и оформить специальную упаковку. Достаточно сказать об этом менеджеру при заказе.',
    },
    uz: {
      question: 'Sovg‘a uchun maxsus qadoqlash mumkinmi?',
      answer:
        'Ha. Mavjud imkoniyatlardan kelib chiqib, mahsulotni sovg‘a sifatida tayyorlash va maxsus qadoqlash bo‘yicha yordam beramiz. Buyurtma vaqtida bu haqda menejerga aytishingiz kifoya.',
    },
  },
  {
    question: 'If the model I want is not on the site, can it be ordered in?',
    answer:
      'For some brands and models an individual order is possible. Send us the name or a picture of the model you are looking for and our specialists will check whether it can be sourced and brought in.',
    ru: {
      question: 'Если нужной модели нет на сайте, можно ли заказать её под привоз?',
      answer:
        'По отдельным брендам и моделям возможен индивидуальный заказ. Пришлите название или фото нужной модели — наши специалисты проверят наличие и возможность привоза.',
    },
    uz: {
      question: 'Kerakli model saytda bo‘lmasa, buyurtma qilib olib kelish mumkinmi?',
      answer:
        'Ayrim brend va modellarda individual buyurtma imkoniyati mavjud. Siz izlayotgan model nomi yoki rasmini bizga yuboring — mutaxassislarimiz mavjudligini va olib kelish imkoniyatini tekshirib beradi.',
    },
  },
];

async function run() {
  const apply = process.argv.includes('--apply');
  await connectDatabase();

  const existing = new Set((await Faq.find().select('question')).map((doc) => doc.question.trim().toLowerCase()));
  const missing = FAQS.filter((faq) => !existing.has(faq.question.trim().toLowerCase()));

  // `order` continues the list rather than restarting it, so seeding into a
  // database that already holds hand-written questions appends instead of
  // colliding with their positions.
  const maxOrder = (await Faq.find().sort({ order: -1 }).limit(1))[0]?.order ?? -1;

  console.log(`[faqs] ${existing.size} already stored, ${missing.length} to insert`);
  for (const faq of missing) console.log(`  + ${faq.question}`);

  if (!apply) {
    console.log('[faqs] dry run — pass --apply to write');
  } else if (missing.length) {
    await Faq.insertMany(
      missing.map((faq, index) => ({
        question: faq.question,
        answer: faq.answer,
        order: maxOrder + 1 + index,
        isActive: true,
        translations: { ru: faq.ru, uz: faq.uz },
      })),
    );
    console.log(`[faqs] inserted ${missing.length}`);
  }

  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
