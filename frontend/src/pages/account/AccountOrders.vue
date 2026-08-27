<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useLocaleStore } from '@/stores/locale';
import { useCurrencyStore } from '@/stores/currency';
import { fetchOrders } from '@/services/account';
import { formatDate, toBrandName, primaryImage } from '@/utils/format';
import SmartImage from '@/components/shared/SmartImage.vue';
import type { Inquiry, Watch } from '@/types/models';
import { productPath } from '@/seo/schema.mjs';

const locale = useLocaleStore();
const currency = useCurrencyStore();

const orders = ref<Inquiry[]>([]);
const isLoading = ref(true);
const hasError = ref(false);

onMounted(async () => {
  try {
    orders.value = await fetchOrders();
  } catch {
    hasError.value = true;
  } finally {
    isLoading.value = false;
  }
});

// `watch` is populated on the server; a request raised without a specific
// timepiece (a general concierge enquiry) leaves it undefined.
function watchOf(order: Inquiry): Watch | null {
  return order.watch && typeof order.watch === 'object' ? (order.watch as unknown as Watch) : null;
}

function statusLabel(status: string): string {
  return locale.t(`account.orderStatus.${status}`);
}
</script>

<template>
  <section class="sw-account__section">
    <h2 class="sw-account__section-title">{{ locale.t('account.ordersTitle') }}</h2>
    <p class="sw-body sw-account__section-lede">{{ locale.t('account.ordersLede') }}</p>

    <p v-if="isLoading" class="sw-body" style="margin-top: 32px">{{ locale.t('account.loading') }}</p>

    <p v-else-if="hasError" class="sw-body" style="margin-top: 32px">{{ locale.t('account.errorGeneric') }}</p>

    <div v-else-if="!orders.length" class="sw-account__empty">
      <h3 class="sw-account__empty-title">{{ locale.t('account.ordersEmptyTitle') }}</h3>
      <p class="sw-body sw-account__empty-body">{{ locale.t('account.ordersEmptyBody') }}</p>
      <RouterLink class="sw-btn sw-account__empty-cta" to="/watches">
        {{ locale.t('account.browseWatches') }} <span class="sw-btn__arrow">&rarr;</span>
      </RouterLink>
    </div>

    <ul v-else class="sw-orders">
      <li v-for="order in orders" :key="order._id" class="sw-order">
        <div class="sw-order__media">
          <SmartImage
            v-if="watchOf(order)"
            :src="primaryImage(watchOf(order))"
            :alt="watchOf(order)!.name"
            aspect-ratio="1 / 1"
            object-fit="contain"
          />
          <span v-else class="sw-order__media-placeholder" aria-hidden="true" />
        </div>

        <div class="sw-order__body">
          <span class="sw-meta sw-order__date">{{ formatDate(order.createdAt, locale.lang) }}</span>

          <RouterLink v-if="watchOf(order)" class="sw-order__title" :to="productPath(watchOf(order)!.slug)">
            <span class="sw-order__brand">{{ toBrandName(watchOf(order)!.brand) }}</span>
            {{ watchOf(order)!.name }}
          </RouterLink>
          <span v-else class="sw-order__title">{{ locale.t('account.generalEnquiry') }}</span>

          <p v-if="order.message" class="sw-body sw-order__message">{{ order.message }}</p>
        </div>

        <div class="sw-order__meta">
          <span
            class="sw-status"
            :class="order.status === 'completed' ? 'sw-status--muted' : 'sw-status--accent'"
          >
            {{ statusLabel(order.status) }}
          </span>
          <span v-if="watchOf(order)" class="sw-order__price">{{ currency.format(watchOf(order)!.price) }}</span>
        </div>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.sw-orders {
  list-style: none;
  margin-top: 32px;
  border-top: 1px solid var(--hairline);
}

.sw-order {
  display: grid;
  grid-template-columns: 96px minmax(0, 1fr) auto;
  align-items: start;
  gap: clamp(20px, 3vw, 40px);
  padding: 28px 0;
  border-bottom: 1px solid var(--hairline);
}

.sw-order__media {
  background: var(--surface-media);
  padding: 8px;
}

.sw-order__media-placeholder {
  display: block;
  aspect-ratio: 1 / 1;
}

.sw-order__body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sw-order__title {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-family: var(--font-serif);
  font-size: clamp(1.125rem, 1.5vw, 1.375rem);
  font-weight: 400;
  line-height: 1.25;
}

.sw-order__brand {
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  font-weight: 500;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.sw-order__message {
  font-size: 0.875rem;
  line-height: 1.7;
  max-width: 54ch;
}

.sw-order__meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
  text-align: right;
}

.sw-order__price {
  font-family: var(--font-sans);
  font-size: 0.875rem;
  font-variant-numeric: tabular-nums;
  color: var(--text-muted);
}

@media (max-width: 640px) {
  .sw-order {
    grid-template-columns: 72px minmax(0, 1fr);
  }

  .sw-order__meta {
    grid-column: 2;
    align-items: flex-start;
    text-align: left;
    flex-direction: row;
    gap: 18px;
  }
}
</style>
