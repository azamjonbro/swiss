<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useLocaleStore } from '@/stores/locale';
import { useAccountStore } from '@/stores/account';
import { useSavedStore } from '@/stores/saved';
import { fetchOrders } from '@/services/account';
import { formatDate, formatPhone } from '@/utils/format';

const locale = useLocaleStore();
const account = useAccountStore();
const saved = useSavedStore();

const orderCount = ref(0);

// The saved count comes from the store, which the session watcher keeps loaded;
// only the order count needs fetching here.
onMounted(async () => {
  try {
    orderCount.value = (await fetchOrders()).length;
  } catch {
    orderCount.value = 0;
  }
});

const memberSince = computed(() => formatDate(account.user?.createdAt, locale.lang));
</script>

<template>
  <section class="sw-account__section">
    <h2 class="sw-account__section-title">{{ locale.t('account.overviewTitle') }}</h2>
    <p class="sw-body sw-account__section-lede">{{ locale.t('account.overviewLede') }}</p>

    <div class="sw-detail-list">
      <div class="sw-detail-row">
        <span class="sw-detail-row__label">{{ locale.t('account.fullName') }}</span>
        <span class="sw-detail-row__value">{{ account.user?.name }}</span>
      </div>
      <div class="sw-detail-row">
        <span class="sw-detail-row__label">{{ locale.t('account.emailLabel') }}</span>
        <span class="sw-detail-row__value">{{ account.user?.email }}</span>
      </div>
      <div class="sw-detail-row">
        <span class="sw-detail-row__label">{{ locale.t('account.phoneLabel') }}</span>
        <span class="sw-detail-row__value">{{ formatPhone(account.user?.phone) || '—' }}</span>
      </div>
      <div class="sw-detail-row">
        <span class="sw-detail-row__label">{{ locale.t('account.accountStatus') }}</span>
        <span class="sw-detail-row__value">
          <span class="sw-status" :class="account.user?.isEmailVerified ? 'sw-status--muted' : 'sw-status--accent'">
            {{ account.user?.isEmailVerified ? locale.t('account.statusVerified') : locale.t('account.statusUnverified') }}
          </span>
        </span>
      </div>
      <div v-if="memberSince" class="sw-detail-row">
        <span class="sw-detail-row__label">{{ locale.t('account.memberSince') }}</span>
        <span class="sw-detail-row__value">{{ memberSince }}</span>
      </div>
    </div>
  </section>

  <section class="sw-account__section">
    <h2 class="sw-account__section-title">{{ locale.t('account.overviewActivityTitle') }}</h2>

    <div class="sw-detail-list">
      <RouterLink class="sw-detail-row sw-account__link-row" to="/account/orders">
        <span class="sw-detail-row__label">{{ locale.t('account.navOrders') }}</span>
        <span class="sw-detail-row__value">{{ orderCount }}</span>
      </RouterLink>
      <RouterLink class="sw-detail-row sw-account__link-row" to="/account/saved">
        <span class="sw-detail-row__label">{{ locale.t('account.navSaved') }}</span>
        <span class="sw-detail-row__value">{{ saved.count }}</span>
      </RouterLink>
    </div>
  </section>
</template>

<style scoped>
/* The two activity rows are navigable; the arrow is the only affordance added. */
.sw-account__link-row {
  transition: color var(--dur-fast) var(--ease-out);
}

.sw-account__link-row .sw-detail-row__value::after {
  content: '→';
  display: inline-block;
  margin-left: 12px;
  transition: transform 0.7s var(--ease-editorial);
}

.sw-account__link-row:hover .sw-detail-row__value::after,
.sw-account__link-row:focus-visible .sw-detail-row__value::after {
  transform: translateX(6px);
}
</style>
