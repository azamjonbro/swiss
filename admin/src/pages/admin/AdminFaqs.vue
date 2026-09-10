<script setup lang="ts">
/**
 * The shop's FAQ.
 *
 * These questions are shown under every watch on the storefront, so the list is
 * short by nature and edited in place — no search, no pagination, no filters
 * that would only ever operate on a dozen rows. What it does need is *order*,
 * because a FAQ has a reading order: the question everyone asks belongs first.
 */
import { ref, computed, onMounted } from 'vue';
import type { Faq, TranslationField, Translations } from '@/types/models';
import { adminFetchFaqs, adminCreateFaq, adminUpdateFaq, adminDeleteFaq } from '@/services/faqs';
import { useLocaleStore } from '@/stores/locale';
import { useToastStore } from '@/stores/toast';
import { useConfirmStore } from '@/stores/confirm';
import TranslationFields from '@/components/admin/TranslationFields.vue';
import AdminModal from '@/components/admin/AdminModal.vue';
import AdminEmpty from '@/components/admin/AdminEmpty.vue';
import AdminIcon from '@/components/shared/AdminIcon.vue';

const locale = useLocaleStore();
const toasts = useToastStore();
const confirm = useConfirmStore();

const faqs = ref<Faq[]>([]);
const isLoading = ref(true);
const isFormOpen = ref(false);
const isSaving = ref(false);
const editingId = ref<string | null>(null);

const translationFields = computed<TranslationField[]>(() => [
  { key: 'question', label: locale.t('admin.faqQuestion') },
  { key: 'answer', label: locale.t('admin.faqAnswer'), type: 'textarea', rows: 4 },
]);

const emptyForm = {
  question: '',
  answer: '',
  order: 0,
  isActive: true,
  translations: {} as Translations,
};
const form = ref({ ...emptyForm });

async function load() {
  isLoading.value = true;
  try {
    faqs.value = await adminFetchFaqs();
  } catch {
    toasts.error(locale.t('admin.loadFailed'));
  } finally {
    isLoading.value = false;
  }
}

function openCreate() {
  editingId.value = null;
  // A new question lands at the bottom of the list rather than tying with the
  // first one — the order it was written in is the only order anyone has.
  const nextOrder = faqs.value.reduce((max, f) => Math.max(max, f.order ?? 0), 0) + 1;
  form.value = { ...emptyForm, order: nextOrder, translations: {} };
  isFormOpen.value = true;
}

function openEdit(faq: Faq) {
  editingId.value = faq._id;
  form.value = {
    question: faq.question,
    answer: faq.answer,
    order: faq.order ?? 0,
    isActive: faq.isActive,
    translations: {
      ru: { ...faq.translations?.ru },
      uz: { ...faq.translations?.uz },
    },
  };
  isFormOpen.value = true;
}

async function submit() {
  // Half an entry is a heading with nothing under it. The API refuses it too;
  // saying so here costs a round trip less.
  if (!form.value.question.trim() || !form.value.answer.trim()) {
    toasts.error(locale.t('admin.faqRequired'));
    return;
  }

  const payload: Partial<Faq> = {
    question: form.value.question,
    answer: form.value.answer,
    order: Number(form.value.order) || 0,
    isActive: form.value.isActive,
    translations: form.value.translations,
  };

  isSaving.value = true;
  try {
    if (editingId.value) {
      await adminUpdateFaq(editingId.value, payload);
    } else {
      await adminCreateFaq(payload);
    }
    isFormOpen.value = false;
    toasts.success(locale.t('admin.faqSaved'));
    await load();
  } catch {
    toasts.error(locale.t('admin.saveFailed'));
  } finally {
    isSaving.value = false;
  }
}

async function remove(faq: Faq) {
  const ok = await confirm.ask({
    title: locale.t('admin.deleteFaqTitle'),
    body: `“${faq.question}” — ${locale.t('admin.deleteConfirmBody')}`,
    confirmLabel: locale.t('admin.confirmDelete'),
    danger: true,
  });
  if (!ok) return;

  await adminDeleteFaq(faq._id);
  toasts.success(locale.t('admin.faqDeleted'));
  await load();
}

onMounted(load);

/** How many of the two translations are filled in, so a gap is visible in the list. */
function translatedCount(faq: Faq): number {
  return (['ru', 'uz'] as const).filter((lang) => {
    const t = faq.translations?.[lang];
    return Boolean(t?.question?.trim() && t?.answer?.trim());
  }).length;
}
</script>

<template>
  <div>
    <div class="sw-admin-page-head">
      <div>
        <h1 class="sw-admin-page-title">{{ locale.t('admin.faqs') }}</h1>
        <p class="sw-admin-page-sub">{{ locale.t('admin.faqsSub') }}</p>
      </div>
      <div class="sw-admin-page-head__actions">
        <button class="sw-admin-btn" type="button" @click="openCreate">
          <AdminIcon name="plus" :size="15" />
          {{ locale.t('admin.newFaq') }}
        </button>
      </div>
    </div>

    <div class="sw-admin-card sw-admin-card--flush">
      <div v-if="isLoading" class="sw-faq__loading">
        <div v-for="n in 4" :key="n" class="sw-admin-skeleton sw-faq__skeleton" />
      </div>

      <AdminEmpty
        v-else-if="!faqs.length"
        icon="faq"
        :title="locale.t('admin.emptyFaqs')"
        :body="locale.t('admin.emptyFaqsBody')"
      >
        <button class="sw-admin-btn sw-admin-btn--sm" type="button" @click="openCreate">
          <AdminIcon name="plus" :size="14" />
          {{ locale.t('admin.newFaq') }}
        </button>
      </AdminEmpty>

      <div v-else class="sw-admin-table-wrap">
        <table class="sw-admin-table">
          <thead>
            <tr>
              <th class="sw-faq__order-col">{{ locale.t('admin.colOrder') }}</th>
              <th>{{ locale.t('admin.faqQuestion') }}</th>
              <th>{{ locale.t('admin.translations') }}</th>
              <th>{{ locale.t('admin.colStatus') }}</th>
              <th class="sw-admin-table__actions"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="faq in faqs" :key="faq._id">
              <td class="sw-faq__order-col">{{ faq.order }}</td>
              <td>
                <div class="sw-admin-cell-title">{{ faq.question }}</div>
                <div class="sw-admin-cell-sub sw-faq__answer">{{ faq.answer }}</div>
              </td>
              <td>
                <span class="sw-admin-badge" :class="translatedCount(faq) === 2 ? 'sw-admin-badge--success' : ''">
                  <span class="sw-admin-badge__dot" />
                  {{ translatedCount(faq) }}/2
                </span>
              </td>
              <td>
                <span class="sw-admin-badge" :class="faq.isActive ? 'sw-admin-badge--success' : ''">
                  <span class="sw-admin-badge__dot" />
                  {{ faq.isActive ? locale.t('admin.active') : locale.t('admin.hidden') }}
                </span>
              </td>
              <td class="sw-admin-table__actions">
                <div>
                  <button
                    class="sw-admin-icon-btn"
                    type="button"
                    :aria-label="locale.t('admin.edit')"
                    @click="openEdit(faq)"
                  >
                    <AdminIcon name="edit" :size="15" />
                  </button>
                  <button
                    class="sw-admin-icon-btn sw-admin-icon-btn--danger"
                    type="button"
                    :aria-label="locale.t('admin.delete')"
                    @click="remove(faq)"
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

    <AdminModal
      :open="isFormOpen"
      :title="editingId ? locale.t('admin.editFaq') : locale.t('admin.newFaq')"
      size="wide"
      @close="isFormOpen = false"
      @submit="submit"
    >
      <label>
        <span>{{ locale.t('admin.faqQuestion') }}</span>
        <input v-model="form.question" type="text" required />
      </label>

      <label>
        <span>{{ locale.t('admin.faqAnswer') }}</span>
        <textarea v-model="form.answer" rows="4" required />
        <small class="sw-faq__hint">{{ locale.t('admin.faqAnswerHint') }}</small>
      </label>

      <TranslationFields
        v-model="form.translations"
        :fields="translationFields"
        :base="{ question: form.question, answer: form.answer }"
      />

      <div class="sw-admin-grid sw-admin-grid--2">
        <label>
          <span>{{ locale.t('admin.colOrder') }}</span>
          <input v-model.number="form.order" type="number" />
        </label>
        <label class="sw-admin-check sw-admin-check--boxed">
          <input v-model="form.isActive" type="checkbox" />
          <span>{{ locale.t('admin.active') }}</span>
        </label>
      </div>

      <p class="sw-faq__note">{{ locale.t('admin.faqDeployNote') }}</p>

      <template #footer>
        <button class="sw-admin-btn sw-admin-btn--ghost" type="button" @click="isFormOpen = false">
          {{ locale.t('admin.cancel') }}
        </button>
        <button class="sw-admin-btn" type="submit" :disabled="isSaving">
          {{ isSaving ? locale.t('admin.saving') : locale.t('admin.save') }}
        </button>
      </template>
    </AdminModal>
  </div>
</template>

<style scoped>
.sw-faq__loading {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.sw-faq__skeleton {
  height: 62px;
  border-radius: 0;
}

.sw-faq__order-col {
  width: 72px;
}

/* Two lines of the answer is enough to tell two questions apart; the whole
   thing is one click away in the form. */
.sw-faq__answer {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  max-width: 70ch;
}

.sw-faq__hint {
  display: block;
  margin-top: 6px;
  color: var(--admin-text-subtle);
  font-size: 0.78rem;
}

.sw-faq__note {
  margin-top: 4px;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  background: var(--admin-surface-2);
  color: var(--admin-text-muted);
  font-size: 0.8rem;
  line-height: 1.5;
}
</style>
