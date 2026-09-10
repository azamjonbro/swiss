/**
 * Fills the FAQ list with the ten questions the shop is actually asked.
 *
 * These are *starting text*, not fixed copy: every one of them is editable in
 * the admin panel, and the answers here deliberately state only what the site
 * already claims elsewhere (a warranty on every watch, a consultant who
 * confirms availability and terms) rather than inventing a delivery window, a
 * returns period or a payment method nobody has confirmed. Sharpen them in the
 * admin once the real terms are known — an answer that is wrong is worse than
 * one that is general.
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
    question: 'Are the watches you sell authentic?',
    answer:
      'Yes. Every timepiece in the catalogue is sourced through official channels and checked before it is listed, and it is handed over with the documentation that came with it.',
    ru: {
      question: 'Все ли часы у вас оригинальные?',
      answer:
        'Да. Каждые часы в каталоге поступают по официальным каналам и проверяются до публикации, а при передаче вы получаете сопроводительные документы.',
    },
    uz: {
      question: 'Sotilayotgan soatlar originalmi?',
      answer:
        'Ha. Katalogdagi har bir soat rasmiy kanallar orqali keltiriladi va e’lon qilinishidan oldin tekshiriladi, topshirishda esa unga tegishli hujjatlar bilan birga beriladi.',
    },
  },
  {
    question: 'Is there a warranty?',
    answer:
      'Every watch bought from SwissWatch Premium comes with a warranty. The exact terms depend on the maison and are confirmed by your consultant before the purchase.',
    ru: {
      question: 'Предоставляется ли гарантия?',
      answer:
        'На каждые часы, купленные в SwissWatch Premium, предоставляется гарантия. Точные условия зависят от мануфактуры, и консультант подтверждает их до покупки.',
    },
    uz: {
      question: 'Kafolat beriladimi?',
      answer:
        'SwissWatch Premium’dan olingan har bir soat kafolat bilan beriladi. Aniq shartlar ishlab chiqaruvchiga bog‘liq va xariddan oldin konsultant tomonidan tasdiqlanadi.',
    },
  },
  {
    question: 'How do I place an order?',
    answer:
      'Send a request from the watch’s page or from your selection. A consultant then contacts you to confirm availability, the final terms and how you would like to receive the watch.',
    ru: {
      question: 'Как оформить заказ?',
      answer:
        'Отправьте запрос со страницы часов или из вашей подборки. Консультант свяжется с вами, чтобы подтвердить наличие, окончательные условия и способ получения.',
    },
    uz: {
      question: 'Buyurtmani qanday berish mumkin?',
      answer:
        'Soat sahifasidan yoki tanlovingizdan so‘rov yuboring. Shundan so‘ng konsultant siz bilan bog‘lanib, mavjudligini, yakuniy shartlarni va soatni qanday olishni xohlashingizni aniqlaydi.',
    },
  },
  {
    question: 'Can I see the watch before I buy it?',
    answer:
      'Yes. Tell your consultant which references interest you and they will arrange for them to be ready at the boutique when you come.',
    ru: {
      question: 'Можно ли посмотреть часы перед покупкой?',
      answer:
        'Да. Сообщите консультанту, какие модели вас интересуют, и он подготовит их к вашему приходу в бутик.',
    },
    uz: {
      question: 'Sotib olishdan oldin soatni ko‘rish mumkinmi?',
      answer:
        'Ha. Qaysi modellar qiziqtirayotganini konsultantga ayting — u kelganingizga soatlarni butikda tayyorlab qo‘yadi.',
    },
  },
  {
    question: 'Where are you located?',
    answer:
      'Our boutique addresses, telephone numbers and opening hours are listed on the About page; each address also carries a map link.',
    ru: {
      question: 'Где вы находитесь?',
      answer:
        'Адреса бутиков, телефоны и часы работы указаны на странице «О нас»; у каждого адреса есть ссылка на карту.',
    },
    uz: {
      question: 'Manzilingiz qayerda?',
      answer:
        'Butiklarimiz manzillari, telefon raqamlari va ish vaqti «Biz haqimizda» sahifasida keltirilgan; har bir manzil yonida xarita havolasi ham bor.',
    },
  },
  {
    question: 'Do you deliver across Uzbekistan?',
    answer:
      'Yes, delivery to other cities is possible. Your consultant agrees the method and the timing with you when the order is confirmed.',
    ru: {
      question: 'Доставляете ли вы по Узбекистану?',
      answer:
        'Да, доставка в другие города возможна. Способ и сроки консультант согласует с вами при подтверждении заказа.',
    },
    uz: {
      question: 'O‘zbekiston bo‘ylab yetkazib berasizmi?',
      answer:
        'Ha, boshqa shaharlarga yetkazib berish mumkin. Usul va muddatni buyurtma tasdiqlanayotganda konsultant siz bilan kelishadi.',
    },
  },
  {
    question: 'How can I pay?',
    answer:
      'Payment is arranged with your consultant when the order is confirmed. The site itself takes no payment — nothing is charged online.',
    ru: {
      question: 'Как можно оплатить?',
      answer:
        'Оплата согласовывается с консультантом при подтверждении заказа. Сам сайт платежи не принимает — онлайн ничего не списывается.',
    },
    uz: {
      question: 'To‘lovni qanday amalga oshiraman?',
      answer:
        'To‘lov buyurtma tasdiqlanayotganda konsultant bilan kelishiladi. Saytning o‘zi to‘lov qabul qilmaydi — onlayn hech narsa yechilmaydi.',
    },
  },
  {
    question: 'Can the bracelet be sized to my wrist?',
    answer:
      'Yes. Bracelet links are adjusted at the boutique when the watch is handed over, and a strap can be changed for another size where the model allows it.',
    ru: {
      question: 'Подгоняете ли вы браслет по руке?',
      answer:
        'Да. Звенья браслета подгоняются в бутике при передаче часов, а ремешок при возможности модели меняется на другой размер.',
    },
    uz: {
      question: 'Brasletni bilagimga moslab berasizmi?',
      answer:
        'Ha. Braslet bo‘g‘inlari soat topshirilayotganda butikda moslanadi, model imkon bergan holda tasma boshqa o‘lchamga almashtiriladi.',
    },
  },
  {
    question: 'What if the watch needs servicing later?',
    answer:
      'Contact us with the reference and the date of purchase and we will tell you what the maison’s service requires and where the work is carried out.',
    ru: {
      question: 'Что делать, если часам потребуется обслуживание?',
      answer:
        'Свяжитесь с нами, указав референс и дату покупки — мы объясним, что требует сервис мануфактуры и где выполняются работы.',
    },
    uz: {
      question: 'Keyinchalik soatga xizmat ko‘rsatish kerak bo‘lsa-chi?',
      answer:
        'Referens va xarid sanasini ko‘rsatgan holda biz bilan bog‘laning — ishlab chiqaruvchi servisi nimani talab qilishini va ish qayerda bajarilishini aytamiz.',
    },
  },
  {
    question: 'Can I exchange or return a watch?',
    answer:
      'Tell your consultant as soon as possible. Exchanges and returns are handled case by case, within the rights Uzbek consumer law gives you.',
    ru: {
      question: 'Можно ли обменять или вернуть часы?',
      answer:
        'Сообщите консультанту как можно скорее. Обмен и возврат рассматриваются индивидуально, в рамках прав, которые даёт законодательство Узбекистана о защите прав потребителей.',
    },
    uz: {
      question: 'Soatni almashtirish yoki qaytarish mumkinmi?',
      answer:
        'Iloji boricha tezroq konsultantga xabar bering. Almashtirish va qaytarish O‘zbekiston iste’molchi huquqlari to‘g‘risidagi qonunchiligi bergan huquqlar doirasida, har bir holat alohida ko‘rib chiqiladi.',
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
