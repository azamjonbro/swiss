<script setup lang="ts">
/**
 * The shop's questions — delivery, warranty, authenticity — under a product.
 *
 * Native `<details>` rather than a scripted accordion: it opens without
 * JavaScript, carries its own keyboard and screen-reader behaviour, and its
 * closed answer is still in the DOM, so a crawler reads every answer whether or
 * not it opens anything.
 *
 * Rendering nothing until the list arrives is deliberate. An empty FAQ heading
 * over a blank strip, or a set of skeleton bars, would push the page's real
 * content down while the request is in flight; the section simply appears.
 */
import { ref, onMounted, watch } from 'vue';
import { useLocaleStore } from '@/stores/locale';
import { fetchFaqs, type Faq } from '@/services/faqs';

const locale = useLocaleStore();
const faqs = ref<Faq[]>([]);

async function load() {
  try {
    faqs.value = await fetchFaqs(locale.lang);
  } catch {
    // The FAQ is supporting copy, not the page: a failed fetch leaves the
    // product exactly as it reads without it.
    faqs.value = [];
  }
}

onMounted(load);
watch(() => locale.lang, load);
</script>

<template>
  <section v-if="faqs.length" class="sw-faq">
    <span class="sw-eyebrow">{{ locale.t('watchDetail.faqEyebrow') }}</span>
    <h2 class="sw-faq__title">{{ locale.t('watchDetail.faqTitle') }}</h2>

    <div class="sw-faq__list">
      <details v-for="faq in faqs" :key="faq._id" class="sw-faq__item">
        <summary class="sw-faq__question">
          <span>{{ faq.question }}</span>
          <span class="sw-faq__sign" aria-hidden="true" />
        </summary>
        <p class="sw-body sw-faq__answer">{{ faq.answer }}</p>
      </details>
    </div>
  </section>
</template>

<style scoped>
.sw-faq {
  padding: 64px 0 96px;
  border-top: 1px solid var(--border);
}

.sw-faq__title {
  margin: 14px 0 34px;
  font-family: var(--font-serif);
  font-size: clamp(1.5rem, 2.6vw, 2.1rem);
  font-weight: 400;
  letter-spacing: -0.01em;
}

.sw-faq__list {
  max-width: 72ch;
  border-top: 1px solid var(--hairline);
}

.sw-faq__item {
  border-bottom: 1px solid var(--hairline);
}

.sw-faq__question {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 20px 0;
  font-size: 1rem;
  line-height: 1.5;
  cursor: pointer;
  list-style: none;
  transition: color var(--dur-fast) var(--ease-out);
}

/* Safari still draws the disclosure triangle without this. */
.sw-faq__question::-webkit-details-marker {
  display: none;
}

.sw-faq__question:hover {
  color: var(--accent);
}

/* A plus that becomes a minus — two rules on one box, the vertical one hidden
   when the answer is open. */
.sw-faq__sign {
  position: relative;
  flex: none;
  width: 13px;
  height: 13px;
}

.sw-faq__sign::before,
.sw-faq__sign::after {
  content: '';
  position: absolute;
  inset: 50% 0 auto 0;
  height: 1px;
  background: currentColor;
}

.sw-faq__sign::after {
  transform: rotate(90deg);
  transition: opacity var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out);
}

.sw-faq__item[open] .sw-faq__sign::after {
  opacity: 0;
  transform: rotate(0deg);
}

.sw-faq__answer {
  margin: 0 0 24px;
  max-width: 62ch;
  color: var(--text-muted);
  line-height: 1.8;
}

@media (prefers-reduced-motion: reduce) {
  .sw-faq__question,
  .sw-faq__sign::after {
    transition: none;
  }
}
</style>
