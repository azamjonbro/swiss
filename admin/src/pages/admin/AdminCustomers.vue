<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue';
import { useLocaleStore } from '@/stores/locale';
import { useToastStore } from '@/stores/toast';
import { adminFetchCustomers, adminFetchCustomer } from '@/services/customers';
import type { CustomerDetail, CustomerRow } from '@/types/customers';
import AdminEmpty from '@/components/admin/AdminEmpty.vue';
import AdminModal from '@/components/admin/AdminModal.vue';
import AdminIcon from '@/components/shared/AdminIcon.vue';

/**
 * Registered storefront customers.
 *
 * Read-only. The page answers who signed up, whether they confirmed their
 * address, when they last signed in and what they have actually done — it does
 * not offer to edit or delete someone else's account, which is a different
 * decision from looking at a list.
 */
const locale = useLocaleStore();
const toasts = useToastStore();

const rows = ref<CustomerRow[]>([]);
const total = ref(0);
const page = ref(1);
const pages = ref(1);
const isLoading = ref(true);

const search = ref('');
const verified = ref<'' | 'true' | 'false'>('');

const detail = ref<CustomerDetail | null>(null);
const isDetailOpen = ref(false);
const isDetailLoading = ref(false);

let controller: AbortController | null = null;
let searchTimer: ReturnType<typeof setTimeout> | null = null;

async function load() {
  controller?.abort();
  controller = new AbortController();

  isLoading.value = true;
  try {
    const data = await adminFetchCustomers(
      {
        search: search.value.trim(),
        verified: verified.value === '' ? undefined : verified.value === 'true',
        page: page.value,
      },
      controller.signal,
    );
    rows.value = data.items;
    total.value = data.total;
    pages.value = data.pages;
  } catch (err) {
    if (isAbort(err)) return;
    toasts.error(locale.t('admin.loadFailed'));
  } finally {
    isLoading.value = false;
  }
}

function isAbort(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const { name, code } = err as { name?: string; code?: string };
  return name === 'CanceledError' || name === 'AbortError' || code === 'ERR_CANCELED';
}

// Typing in the search box should not fire a request per keystroke.
watch(search, () => {
  if (searchTimer !== null) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    page.value = 1;
    void load();
  }, 300);
});

watch([verified, page], () => void load());
void load();

onUnmounted(() => {
  controller?.abort();
  if (searchTimer !== null) clearTimeout(searchTimer);
});

async function openDetail(row: CustomerRow) {
  isDetailOpen.value = true;
  isDetailLoading.value = true;
  detail.value = null;
  try {
    detail.value = await adminFetchCustomer(row._id);
  } catch {
    toasts.error(locale.t('admin.loadFailed'));
    isDetailOpen.value = false;
  } finally {
    isDetailLoading.value = false;
  }
}

/* ---- formatting ---- */

function formatDate(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * "Never" is a meaningfully different answer from a date here: it means the
 * person registered and has not been back, which is the whole reason to show
 * the column.
 */
function formatLastLogin(value: string | null): string {
  return value ? formatDate(value) : locale.t('admin.customersNeverSignedIn');
}

const pendingCount = computed(() => rows.value.filter((row) => !row.isEmailVerified).length);
</script>

<template>
  <div>
    <div class="sw-admin-page-head">
      <div>
        <h1 class="sw-admin-page-title">{{ locale.t('admin.customers') }}</h1>
        <p class="sw-admin-page-sub">{{ locale.t('admin.customersSub') }}</p>
      </div>
      <div class="sw-admin-page-head__actions sw-cust__filters">
        <input
          v-model="search"
          class="sw-cust__search"
          type="search"
          :placeholder="locale.t('admin.customersSearch')"
        />
        <select v-model="verified" class="sw-cust__select">
          <option value="">{{ locale.t('admin.customersAll') }}</option>
          <option value="true">{{ locale.t('admin.customersVerified') }}</option>
          <option value="false">{{ locale.t('admin.customersPending') }}</option>
        </select>
      </div>
    </div>

    <p v-if="!isLoading && rows.length && pendingCount" class="sw-cust__note">
      <AdminIcon name="info" :size="15" />
      {{ pendingCount }} {{ locale.t('admin.customersPendingNote') }}
    </p>

    <div class="sw-admin-card sw-admin-card--flush">
      <div v-if="isLoading" class="sw-cust__skeletons">
        <div v-for="n in 6" :key="n" class="sw-admin-skeleton sw-cust__skeleton" />
      </div>

      <AdminEmpty
        v-else-if="!rows.length"
        :title="locale.t('admin.customersEmptyTitle')"
        :body="locale.t('admin.customersEmptyBody')"
      />

      <div v-else class="sw-admin-table-wrap">
        <table class="sw-admin-table">
          <thead>
            <tr>
              <th>{{ locale.t('admin.customersName') }}</th>
              <th>{{ locale.t('admin.customersContact') }}</th>
              <th>{{ locale.t('admin.customersStatus') }}</th>
              <th>{{ locale.t('admin.customersActivity') }}</th>
              <th>{{ locale.t('admin.customersRegistered') }}</th>
              <th>{{ locale.t('admin.customersLastLogin') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row._id" class="sw-cust__row" @click="openDetail(row)">
              <td>
                <span class="sw-admin-cell-title">{{ row.name || '—' }}</span>
              </td>
              <td>
                <span class="sw-admin-cell-title">{{ row.email }}</span>
                <span v-if="row.phone" class="sw-admin-cell-sub">{{ row.phone }}</span>
              </td>
              <td>
                <span class="sw-admin-badge" :class="row.isEmailVerified ? 'sw-admin-badge--success' : ''">
                  {{ row.isEmailVerified ? locale.t('admin.customersVerified') : locale.t('admin.customersPending') }}
                </span>
              </td>
              <td class="sw-cust__activity">
                <span v-if="row.inquiryCount">{{ row.inquiryCount }} {{ locale.t('admin.customersInquiriesShort') }}</span>
                <span v-if="row.savedCount">{{ row.savedCount }} {{ locale.t('admin.customersSavedShort') }}</span>
                <span v-if="!row.inquiryCount && !row.savedCount" class="sw-cust__muted">—</span>
              </td>
              <td class="sw-cust__date">{{ formatDate(row.createdAt) }}</td>
              <td class="sw-cust__date" :class="{ 'sw-cust__muted': !row.lastLoginAt }">
                {{ formatLastLogin(row.lastLoginAt) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="pages > 1" class="sw-cust__pager">
      <button
        type="button"
        class="sw-admin-btn sw-admin-btn--sm sw-admin-btn--ghost"
        :disabled="page <= 1"
        @click="page -= 1"
      >
        {{ locale.t('admin.customersPrev') }}
      </button>
      <span class="sw-cust__pager-label">{{ page }} / {{ pages }} · {{ total }}</span>
      <button
        type="button"
        class="sw-admin-btn sw-admin-btn--sm sw-admin-btn--ghost"
        :disabled="page >= pages"
        @click="page += 1"
      >
        {{ locale.t('admin.customersNext') }}
      </button>
    </div>

    <!-- AdminModal owns its own visibility and the body-scroll lock that goes
         with it, so it takes `open` rather than being mounted with v-if. -->
    <AdminModal
      :open="isDetailOpen"
      :title="detail?.customer.name || locale.t('admin.customers')"
      :subtitle="detail?.customer.email"
      @close="isDetailOpen = false"
    >
      <template #footer>
        <button type="button" class="sw-admin-btn sw-admin-btn--ghost" @click="isDetailOpen = false">
          {{ locale.t('admin.customersClose') }}
        </button>
      </template>

      <div v-if="isDetailLoading" class="sw-cust__skeletons">
        <div v-for="n in 4" :key="n" class="sw-admin-skeleton sw-cust__skeleton" />
      </div>

      <div v-else-if="detail" class="sw-cust__detail">
        <dl class="sw-cust__facts">
          <div>
            <dt>{{ locale.t('admin.customersContact') }}</dt>
            <dd>{{ detail.customer.email }}<br />{{ detail.customer.phone || '—' }}</dd>
          </div>
          <div>
            <dt>{{ locale.t('admin.customersStatus') }}</dt>
            <dd>
              <span class="sw-admin-badge" :class="detail.customer.isEmailVerified ? 'sw-admin-badge--success' : ''">
                {{ detail.customer.isEmailVerified ? locale.t('admin.customersVerified') : locale.t('admin.customersPending') }}
              </span>
            </dd>
          </div>
          <div>
            <dt>{{ locale.t('admin.customersRegistered') }}</dt>
            <dd>{{ formatDate(detail.customer.createdAt) }}</dd>
          </div>
          <div>
            <dt>{{ locale.t('admin.customersLastLogin') }}</dt>
            <dd>{{ formatLastLogin(detail.customer.lastLoginAt) }}</dd>
          </div>
        </dl>

        <section class="sw-cust__section">
          <h3 class="sw-cust__section-title">{{ locale.t('admin.customersSaved') }}</h3>
          <p v-if="!detail.savedWatches.length" class="sw-cust__muted">{{ locale.t('admin.customersNoSaved') }}</p>
          <ul v-else class="sw-cust__list">
            <li v-for="watch in detail.savedWatches" :key="watch._id">
              {{ watch.name }}
              <span v-if="watch.reference" class="sw-cust__muted">· {{ watch.reference }}</span>
            </li>
          </ul>
        </section>

        <section class="sw-cust__section">
          <h3 class="sw-cust__section-title">{{ locale.t('admin.customersInquiries') }}</h3>
          <p v-if="!detail.inquiries.length" class="sw-cust__muted">{{ locale.t('admin.customersNoInquiries') }}</p>
          <ul v-else class="sw-cust__list">
            <li v-for="inquiry in detail.inquiries" :key="inquiry._id">
              <span class="sw-cust__muted">{{ formatDate(inquiry.createdAt) }}</span>
              — {{ inquiry.watch?.name ?? locale.t('admin.customersGeneralInquiry') }}
              <span class="sw-admin-badge">{{ inquiry.status }}</span>
            </li>
          </ul>
        </section>
      </div>
    </AdminModal>
  </div>
</template>

<style scoped>
.sw-cust__filters {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.sw-cust__search,
.sw-cust__select {
  font: inherit;
  font-size: 0.85rem;
  color: var(--admin-text);
  background: var(--admin-surface);
  border: 1px solid var(--admin-border);
  border-radius: var(--radius-md);
  padding: 8px 11px;
}

.sw-cust__search {
  min-width: 200px;
}

.sw-cust__search:focus-visible,
.sw-cust__select:focus-visible {
  outline: none;
  border-color: var(--admin-accent);
  box-shadow: var(--shadow-ring);
}

.sw-cust__note {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 14px;
  font-size: 0.82rem;
  color: var(--admin-text-muted);
}

.sw-cust__note :deep(svg) {
  color: var(--admin-warning);
  flex-shrink: 0;
}

.sw-cust__row {
  cursor: pointer;
}

.sw-cust__skeletons {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px;
}

.sw-cust__skeleton {
  height: 38px;
}

.sw-cust__activity {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 0.8rem;
  color: var(--admin-text-muted);
}

.sw-cust__date {
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.sw-cust__muted {
  color: var(--admin-text-subtle);
}

.sw-cust__pager {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 14px;
}

.sw-cust__pager-label {
  font-size: 0.8rem;
  color: var(--admin-text-muted);
  font-variant-numeric: tabular-nums;
}

.sw-cust__detail {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.sw-cust__facts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 14px;
  margin: 0;
}

.sw-cust__facts dt {
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--admin-text-subtle);
  margin-bottom: 5px;
}

.sw-cust__facts dd {
  margin: 0;
  font-size: 0.88rem;
  line-height: 1.5;
}

.sw-cust__section-title {
  margin: 0 0 8px;
  font-size: 0.7rem;
  font-weight: 650;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--admin-text-muted);
}

.sw-cust__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 0.86rem;
}
</style>
