<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import type { Branch, TranslationField, Translations } from '@/types/models';
import {
  adminFetchBranches,
  adminCreateBranch,
  adminUpdateBranch,
  adminDeleteBranch,
} from '@/services/branches';
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

const branches = ref<Branch[]>([]);
const isLoading = ref(true);
const isFormOpen = ref(false);
const isSaving = ref(false);
const editingId = ref<string | null>(null);

const translationFields = computed<TranslationField[]>(() => [
  { key: 'name', label: locale.t('admin.branchName') },
  { key: 'streetAddress', label: locale.t('admin.branchStreet') },
  { key: 'addressLocality', label: locale.t('admin.branchCity') },
  { key: 'addressRegion', label: locale.t('admin.branchRegion') },
]);

/**
 * The two list fields are edited as one textarea each, one entry per line.
 *
 * A row of inputs with add/remove buttons is the obvious alternative and is
 * worse for this: both lists are short, both are pasted in from somewhere else
 * more often than typed, and neither has any per-entry structure to justify a
 * widget. Blank lines are dropped on save.
 */
const emptyForm = {
  name: '',
  streetAddress: '',
  addressLocality: '',
  addressRegion: '',
  postalCode: '',
  addressCountry: 'UZ',
  phonesText: '',
  hoursText: '',
  latitude: '',
  longitude: '',
  mapUrl: '',
  order: 0,
  isActive: true,
  translations: {} as Translations,
};
const form = ref({ ...emptyForm });

const toLines = (value: string) =>
  value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

async function load() {
  isLoading.value = true;
  try {
    branches.value = await adminFetchBranches();
  } catch {
    toasts.error(locale.t('admin.loadFailed'));
  } finally {
    isLoading.value = false;
  }
}

function openCreate() {
  editingId.value = null;
  // `order` continues the list rather than starting at 0, so a new branch lands
  // at the bottom instead of tying with the first one.
  const nextOrder = branches.value.reduce((max, b) => Math.max(max, b.order ?? 0), 0) + 1;
  form.value = { ...emptyForm, order: nextOrder, translations: {} };
  isFormOpen.value = true;
}

function openEdit(branch: Branch) {
  editingId.value = branch._id;
  form.value = {
    name: branch.name,
    streetAddress: branch.streetAddress ?? '',
    addressLocality: branch.addressLocality ?? '',
    addressRegion: branch.addressRegion ?? '',
    postalCode: branch.postalCode ?? '',
    addressCountry: branch.addressCountry || 'UZ',
    phonesText: (branch.phones ?? []).join('\n'),
    hoursText: (branch.openingHours ?? []).join('\n'),
    // Empty string, not "0": a branch that has never been surveyed must not
    // open the form showing a coordinate it does not have.
    latitude: branch.geo?.latitude != null ? String(branch.geo.latitude) : '',
    longitude: branch.geo?.longitude != null ? String(branch.geo.longitude) : '',
    mapUrl: branch.mapUrl ?? '',
    order: branch.order ?? 0,
    isActive: branch.isActive,
    translations: {
      ru: { ...branch.translations?.ru },
      uz: { ...branch.translations?.uz },
    },
  };
  isFormOpen.value = true;
}

async function submit() {
  const lat = Number(form.value.latitude);
  const lng = Number(form.value.longitude);
  // Both or neither. One half of a coordinate pair is not a location, and the
  // API would drop it anyway — saying so here is cheaper than a silent no-op.
  const hasLat = form.value.latitude.trim() !== '';
  const hasLng = form.value.longitude.trim() !== '';
  if (hasLat !== hasLng || (hasLat && (!Number.isFinite(lat) || !Number.isFinite(lng)))) {
    toasts.error(locale.t('admin.branchGeoInvalid'));
    return;
  }

  const payload: Partial<Branch> = {
    name: form.value.name,
    streetAddress: form.value.streetAddress,
    addressLocality: form.value.addressLocality,
    addressRegion: form.value.addressRegion,
    postalCode: form.value.postalCode,
    addressCountry: form.value.addressCountry,
    phones: toLines(form.value.phonesText),
    openingHours: toLines(form.value.hoursText),
    geo: hasLat ? { latitude: lat, longitude: lng } : null,
    mapUrl: form.value.mapUrl,
    order: Number(form.value.order) || 0,
    isActive: form.value.isActive,
    translations: form.value.translations,
  };

  isSaving.value = true;
  try {
    if (editingId.value) {
      await adminUpdateBranch(editingId.value, payload);
    } else {
      await adminCreateBranch(payload);
    }
    isFormOpen.value = false;
    toasts.success(locale.t('admin.branchSaved'));
    await load();
  } catch {
    toasts.error(locale.t('admin.saveFailed'));
  } finally {
    isSaving.value = false;
  }
}

async function remove(branch: Branch) {
  const ok = await confirm.ask({
    title: locale.t('admin.deleteBranchTitle'),
    body: `“${branch.name}” — ${locale.t('admin.deleteConfirmBody')}`,
    confirmLabel: locale.t('admin.confirmDelete'),
    danger: true,
  });
  if (!ok) return;

  await adminDeleteBranch(branch._id);
  toasts.success(locale.t('admin.branchDeleted'));
  await load();
}

onMounted(load);

/** The address on one line, skipping the parts nobody has filled in. */
function addressLine(branch: Branch): string {
  return [branch.streetAddress, branch.addressLocality, branch.addressRegion, branch.postalCode]
    .map((part) => (part ?? '').trim())
    .filter(Boolean)
    .join(', ');
}
</script>

<template>
  <div>
    <div class="sw-admin-page-head">
      <div>
        <h1 class="sw-admin-page-title">{{ locale.t('admin.branches') }}</h1>
        <p class="sw-admin-page-sub">{{ locale.t('admin.branchesSub') }}</p>
      </div>
      <div class="sw-admin-page-head__actions">
        <button class="sw-admin-btn" type="button" @click="openCreate">
          <AdminIcon name="plus" :size="15" />
          {{ locale.t('admin.newBranch') }}
        </button>
      </div>
    </div>

    <div class="sw-admin-card sw-admin-card--flush">
      <div v-if="isLoading" class="sw-branch__loading">
        <div v-for="n in 3" :key="n" class="sw-admin-skeleton sw-branch__skeleton" />
      </div>

      <AdminEmpty
        v-else-if="!branches.length"
        icon="branch"
        :title="locale.t('admin.emptyBranches')"
        :body="locale.t('admin.emptyBranchesBody')"
      >
        <button class="sw-admin-btn sw-admin-btn--sm" type="button" @click="openCreate">
          <AdminIcon name="plus" :size="14" />
          {{ locale.t('admin.newBranch') }}
        </button>
      </AdminEmpty>

      <div v-else class="sw-admin-table-wrap">
        <table class="sw-admin-table">
          <thead>
            <tr>
              <th>{{ locale.t('admin.branchName') }}</th>
              <th>{{ locale.t('admin.branchAddress') }}</th>
              <th>{{ locale.t('admin.branchPhones') }}</th>
              <th>{{ locale.t('admin.colStatus') }}</th>
              <th class="sw-admin-table__actions"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="branch in branches" :key="branch._id">
              <td>
                <div class="sw-admin-cell-title">{{ branch.name }}</div>
                <div v-if="branch.mapUrl" class="sw-admin-cell-sub">
                  <a :href="branch.mapUrl" target="_blank" rel="noopener">{{ locale.t('admin.branchMapUrl') }}</a>
                </div>
              </td>
              <td>
                <span v-if="addressLine(branch)">{{ addressLine(branch) }}</span>
                <!-- Called out rather than left blank: this is the one field
                     that decides whether the branch reaches /stores at all. -->
                <span v-else class="sw-branch__missing">{{ locale.t('admin.branchNoAddress') }}</span>
              </td>
              <td>
                <div v-for="number in branch.phones ?? []" :key="number">{{ number }}</div>
              </td>
              <td>
                <span class="sw-admin-badge" :class="branch.isActive ? 'sw-admin-badge--success' : ''">
                  <span class="sw-admin-badge__dot" />
                  {{ branch.isActive ? locale.t('admin.active') : locale.t('admin.hidden') }}
                </span>
              </td>
              <td class="sw-admin-table__actions">
                <div>
                  <button
                    class="sw-admin-icon-btn"
                    type="button"
                    :aria-label="locale.t('admin.edit')"
                    @click="openEdit(branch)"
                  >
                    <AdminIcon name="edit" :size="15" />
                  </button>
                  <button
                    class="sw-admin-icon-btn sw-admin-icon-btn--danger"
                    type="button"
                    :aria-label="locale.t('admin.delete')"
                    @click="remove(branch)"
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
      :title="editingId ? locale.t('admin.editBranch') : locale.t('admin.newBranch')"
      size="wide"
      @close="isFormOpen = false"
      @submit="submit"
    >
      <label>
        <span>{{ locale.t('admin.branchName') }}</span>
        <input v-model="form.name" type="text" required />
      </label>

      <label>
        <span>{{ locale.t('admin.branchStreet') }}</span>
        <input v-model="form.streetAddress" type="text" />
        <small class="sw-branch__hint">{{ locale.t('admin.branchStreetHint') }}</small>
      </label>

      <div class="sw-admin-grid sw-admin-grid--2">
        <label>
          <span>{{ locale.t('admin.branchCity') }}</span>
          <input v-model="form.addressLocality" type="text" />
        </label>
        <label>
          <span>{{ locale.t('admin.branchRegion') }}</span>
          <input v-model="form.addressRegion" type="text" />
        </label>
        <label>
          <span>{{ locale.t('admin.branchPostal') }}</span>
          <input v-model="form.postalCode" type="text" />
        </label>
        <label>
          <span>{{ locale.t('admin.branchCountry') }}</span>
          <input v-model="form.addressCountry" type="text" maxlength="2" />
        </label>
      </div>

      <div class="sw-admin-grid sw-admin-grid--2">
        <label>
          <span>{{ locale.t('admin.branchPhones') }}</span>
          <textarea v-model="form.phonesText" rows="3" />
          <small class="sw-branch__hint">{{ locale.t('admin.branchPhonesHint') }}</small>
        </label>
        <label>
          <span>{{ locale.t('admin.branchHours') }}</span>
          <textarea v-model="form.hoursText" rows="3" />
          <small class="sw-branch__hint">{{ locale.t('admin.branchHoursHint') }}</small>
        </label>
      </div>

      <div class="sw-admin-grid sw-admin-grid--2">
        <label>
          <span>{{ locale.t('admin.branchLat') }}</span>
          <input v-model="form.latitude" type="text" inputmode="decimal" />
        </label>
        <label>
          <span>{{ locale.t('admin.branchLng') }}</span>
          <input v-model="form.longitude" type="text" inputmode="decimal" />
        </label>
      </div>

      <label>
        <span>{{ locale.t('admin.branchMapUrl') }}</span>
        <input v-model="form.mapUrl" type="url" placeholder="https://" />
      </label>

      <TranslationFields
        v-model="form.translations"
        :fields="translationFields"
        :base="{
          name: form.name,
          streetAddress: form.streetAddress,
          addressLocality: form.addressLocality,
          addressRegion: form.addressRegion,
        }"
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

      <p class="sw-branch__note">{{ locale.t('admin.branchDeployNote') }}</p>

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
.sw-branch__loading {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.sw-branch__skeleton {
  height: 66px;
  border-radius: 0;
}

.sw-branch__missing {
  color: var(--admin-text-subtle);
  font-style: italic;
}

.sw-branch__hint {
  display: block;
  margin-top: 6px;
  color: var(--admin-text-subtle);
  font-size: 0.78rem;
}

.sw-branch__note {
  margin-top: 4px;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  background: var(--admin-surface-2);
  color: var(--admin-text-muted);
  font-size: 0.8rem;
  line-height: 1.5;
}
</style>
