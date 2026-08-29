<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import type { Inquiry, InquiryStatus } from '@/types/models';
import { adminFetchInquiries, adminUpdateInquiry, adminDeleteInquiry } from '@/services/inquiries';
import { useLocaleStore } from '@/stores/locale';
import { useToastStore } from '@/stores/toast';
import { useConfirmStore } from '@/stores/confirm';
import AdminEmpty from '@/components/admin/AdminEmpty.vue';
import AdminIcon from '@/components/shared/AdminIcon.vue';

const locale = useLocaleStore();
const toasts = useToastStore();
const confirm = useConfirmStore();

const inquiries = ref<Inquiry[]>([]);
const statusFilter = ref<InquiryStatus | ''>('');
const isLoading = ref(true);

const STATUS_TONE: Record<InquiryStatus, string> = {
  new: 'sw-admin-badge--accent',
  contacted: 'sw-admin-badge--info',
  completed: 'sw-admin-badge--success',
  cancelled: '',
};

const statusOptions = computed(() => [
  { value: 'new' as const, label: locale.t('admin.statusNew') },
  { value: 'contacted' as const, label: locale.t('admin.statusContacted') },
  { value: 'completed' as const, label: locale.t('admin.statusCompleted') },
  { value: 'cancelled' as const, label: locale.t('admin.statusCancelled') },
]);

function statusLabel(status: InquiryStatus): string {
  return statusOptions.value.find((o) => o.value === status)?.label ?? status;
}

async function load() {
  isLoading.value = true;
  try {
    const data = await adminFetchInquiries({ status: statusFilter.value || undefined });
    inquiries.value = data.items;
  } catch {
    toasts.error(locale.t('admin.loadFailed'));
  } finally {
    isLoading.value = false;
  }
}

async function updateStatus(inquiry: Inquiry, status: InquiryStatus) {
  const updated = await adminUpdateInquiry(inquiry._id, status);
  inquiry.status = updated.status;
  toasts.success(locale.t('admin.inquiryUpdated'));
}

async function remove(inquiry: Inquiry) {
  const ok = await confirm.ask({
    title: locale.t('admin.deleteInquiryTitle'),
    body: `“${inquiry.name}” — ${locale.t('admin.deleteConfirmBody')}`,
    confirmLabel: locale.t('admin.confirmDelete'),
    danger: true,
  });
  if (!ok) return;

  await adminDeleteInquiry(inquiry._id);
  toasts.success(locale.t('admin.inquiryDeleted'));
  await load();
}

function watchName(watch: Inquiry['watch']): string {
  if (!watch) return '—';
  return typeof watch === 'string' ? watch : watch.name;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(locale.lang, { day: 'numeric', month: 'short', year: 'numeric' });
}

onMounted(load);
</script>

<template>
  <div>
    <div class="sw-admin-page-head">
      <div>
        <h1 class="sw-admin-page-title">{{ locale.t('admin.inquiries') }}</h1>
        <p class="sw-admin-page-sub">{{ locale.t('admin.inquiriesSub') }}</p>
      </div>
      <div class="sw-admin-page-head__actions">
        <label class="sw-inq__filter">
          <span class="sw-visually-hidden">{{ locale.t('admin.colStatus') }}</span>
          <select v-model="statusFilter" @change="load">
            <option value="">{{ locale.t('admin.allStatuses') }}</option>
            <option v-for="opt in statusOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </label>
      </div>
    </div>

    <div class="sw-admin-card sw-admin-card--flush">
      <div v-if="isLoading" class="sw-inq__loading">
        <div v-for="n in 4" :key="n" class="sw-admin-skeleton sw-inq__skeleton" />
      </div>

      <AdminEmpty
        v-else-if="!inquiries.length"
        icon="inquiry"
        :title="locale.t('admin.emptyInquiries')"
        :body="locale.t('admin.emptyInquiriesBody')"
      />

      <div v-else class="sw-admin-table-wrap">
        <table class="sw-admin-table">
          <thead>
            <tr>
              <th>{{ locale.t('admin.name') }}</th>
              <th>{{ locale.t('admin.colContact') }}</th>
              <th>{{ locale.t('admin.colWatch') }}</th>
              <th>{{ locale.t('admin.colMessage') }}</th>
              <th>{{ locale.t('admin.colStatus') }}</th>
              <th class="sw-admin-table__actions"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="inquiry in inquiries" :key="inquiry._id">
              <td>
                <div class="sw-admin-cell-title">{{ inquiry.name }}</div>
                <div class="sw-admin-cell-sub">{{ formatDate(inquiry.createdAt) }}</div>
              </td>
              <td>
                <a v-if="inquiry.email" class="sw-inq__link" :href="`mailto:${inquiry.email}`">{{ inquiry.email }}</a>
                <div v-if="inquiry.phone" class="sw-admin-cell-sub">
                  <a class="sw-inq__link" :href="`tel:${inquiry.phone}`">{{ inquiry.phone }}</a>
                </div>
              </td>
              <td>{{ watchName(inquiry.watch) }}</td>
              <td class="sw-inq__message" :title="inquiry.message">{{ inquiry.message }}</td>
              <td>
                <span class="sw-admin-badge" :class="STATUS_TONE[inquiry.status]">
                  <span class="sw-admin-badge__dot" />
                  {{ statusLabel(inquiry.status) }}
                </span>
              </td>
              <td class="sw-admin-table__actions">
                <div class="sw-inq__row-actions">
                  <label class="sw-inq__status-select">
                    <span class="sw-visually-hidden">{{ locale.t('admin.colStatus') }}</span>
                    <select
                      :value="inquiry.status"
                      @change="updateStatus(inquiry, ($event.target as HTMLSelectElement).value as InquiryStatus)"
                    >
                      <option v-for="opt in statusOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                    </select>
                  </label>
                  <button
                    class="sw-admin-icon-btn sw-admin-icon-btn--danger"
                    type="button"
                    :aria-label="locale.t('admin.delete')"
                    @click="remove(inquiry)"
                  >
                    <AdminIcon name="trash" :size="15" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sw-inq__filter select {
  min-width: 170px;
}

.sw-inq__loading {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.sw-inq__skeleton {
  height: 66px;
  border-radius: 0;
}

.sw-inq__link {
  color: var(--admin-text);
  transition: color var(--dur-fast) var(--ease-out);
}

.sw-inq__link:hover {
  color: var(--admin-accent);
}

.sw-inq__message {
  max-width: 260px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--admin-text-muted);
}

/* The status control is a real action, so it stays visible rather than fading
   in on hover with the icon buttons. */
.sw-inq__row-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  opacity: 1 !important;
}

.sw-inq__status-select select {
  min-width: 150px;
  padding-top: 6px;
  padding-bottom: 6px;
  font-size: 0.8rem;
}
</style>
