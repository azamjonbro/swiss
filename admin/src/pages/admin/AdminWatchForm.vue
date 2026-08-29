<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type {
  Watch,
  Category,
  Brand,
  Collection,
  Availability,
  TranslationField,
  Translations,
  WatchVariant,
} from '@/types/models';
import { adminFetchWatch, adminCreateWatch, adminUpdateWatch } from '@/services/watches';
import { adminFetchCategories } from '@/services/categories';
import { adminFetchBrands } from '@/services/brands';
import { adminFetchCollections } from '@/services/collections';
import { useLocaleStore } from '@/stores/locale';
import { useToastStore } from '@/stores/toast';
import MediaUploader from '@/components/admin/MediaUploader.vue';
import TranslationFields from '@/components/admin/TranslationFields.vue';
import AdminIcon from '@/components/shared/AdminIcon.vue';
import { resolveMediaUrl } from '@/utils/media';

const route = useRoute();
const router = useRouter();
const locale = useLocaleStore();
const toasts = useToastStore();

const isEdit = computed(() => Boolean(route.params.id));

const categories = ref<Category[]>([]);
const brands = ref<Brand[]>([]);
const collections = ref<Collection[]>([]);

const translationFields = computed<TranslationField[]>(() => [
  { key: 'name', label: locale.t('admin.name') },
  { key: 'shortDescription', label: locale.t('admin.shortDescription') },
  { key: 'description', label: locale.t('admin.fullDescription'), type: 'textarea', rows: 4 },
]);

const form = ref({
  name: '',
  reference: '',
  brand: '',
  category: '',
  collectionRef: '',
  type: 'watch' as 'watch' | 'accessory',
  price: 0,
  currency: 'USD',
  shortDescription: '',
  description: '',
  movement: '',
  caseMaterial: '',
  caseSize: '',
  dial: '',
  bracelet: '',
  waterResistance: '',
  availability: 'in-stock' as Availability,
  featured: false,
  isNewArrival: false,
  isActive: true,
  images: [] as string[],
  videos: [] as string[],
  translations: {} as Translations,
});

const isSaving = ref(false);
const isLoading = ref(false);
const errorMessage = ref('');
// Additional colourways beyond the one this simplified form edits — carried
// through untouched so saving never drops a product's other variants.
const otherVariants = ref<Watch['variants']>([]);
// The primary colourway's own fields (slug and its translated labels) are not
// editable here either, so keep the saved ones instead of writing blanks over
// them — otherwise every edit wipes the Russian/Uzbek colour names.
const primaryVariantMeta = ref<Pick<WatchVariant, 'colorSlug' | 'colorLabel' | 'colorLabelRu' | 'colorLabelUz'>>({
  colorSlug: 'default',
  colorLabel: '',
});

function brandIdOf(brand: Watch['brand']): string {
  return typeof brand === 'string' ? brand : brand._id;
}
function categoryIdOf(category: Watch['category']): string {
  return typeof category === 'string' ? category : category._id;
}

async function loadWatch(id: string) {
  const watch = await adminFetchWatch(id);
  form.value = {
    name: watch.name,
    reference: watch.reference,
    brand: brandIdOf(watch.brand),
    category: categoryIdOf(watch.category),
    collectionRef: watch.collectionRef ?? '',
    type: watch.type ?? 'watch',
    price: watch.price,
    currency: watch.currency,
    shortDescription: watch.shortDescription,
    description: watch.description,
    movement: watch.movement,
    caseMaterial: watch.caseMaterial,
    caseSize: watch.caseSize,
    dial: watch.dial,
    bracelet: watch.bracelet,
    waterResistance: watch.waterResistance,
    availability: watch.availability,
    featured: watch.featured,
    isNewArrival: watch.isNewArrival,
    isActive: watch.isActive,
    // The form only edits a single colourway for now — the product's other
    // variants (if any) pass through untouched on save via otherVariants.
    images: [...(watch.variants?.[0]?.images ?? [])],
    videos: [...(watch.variants?.[0]?.videos ?? [])],
    translations: {
      ru: { ...watch.translations?.ru },
      uz: { ...watch.translations?.uz },
    },
  };

  const primary = watch.variants?.[0];
  if (primary) {
    primaryVariantMeta.value = {
      colorSlug: primary.colorSlug || 'default',
      colorLabel: primary.colorLabel ?? '',
      colorLabelRu: primary.colorLabelRu,
      colorLabelUz: primary.colorLabelUz,
    };
  }
  otherVariants.value = watch.variants?.slice(1) ?? [];
}

onMounted(async () => {
  isLoading.value = true;
  try {
    const [categoriesData, brandsData, collectionsData] = await Promise.all([
      adminFetchCategories(),
      adminFetchBrands(),
      adminFetchCollections(),
    ]);
    categories.value = categoriesData;
    brands.value = brandsData;
    collections.value = collectionsData;

    if (isEdit.value) await loadWatch(route.params.id as string);
  } catch {
    toasts.error(locale.t('admin.loadFailed'));
  } finally {
    isLoading.value = false;
  }
});

function onImageUploaded(url: string) {
  form.value.images.push(url);
}
function onVideoUploaded(url: string) {
  form.value.videos.push(url);
}
function removeImage(index: number) {
  form.value.images.splice(index, 1);
}
function removeVideo(index: number) {
  form.value.videos.splice(index, 1);
}

async function submit() {
  errorMessage.value = '';
  if (!form.value.name || !form.value.brand || !form.value.category || !form.value.price) {
    errorMessage.value = locale.t('admin.requiredFields');
    return;
  }

  isSaving.value = true;
  try {
    const { images, videos, ...rest } = form.value;
    const primaryVariant = { ...primaryVariantMeta.value, images, videos };
    const payload = {
      ...rest,
      collectionRef: form.value.collectionRef || undefined,
      variants: [primaryVariant, ...otherVariants.value],
    };
    if (isEdit.value) {
      await adminUpdateWatch(route.params.id as string, payload);
    } else {
      await adminCreateWatch(payload);
    }
    toasts.success(locale.t('admin.watchSaved'));
    router.push('/watches');
  } catch {
    errorMessage.value = locale.t('admin.saveFailed');
    toasts.error(locale.t('admin.saveFailed'));
  } finally {
    isSaving.value = false;
  }
}
</script>

<template>
  <div>
    <RouterLink class="sw-wf__back" to="/watches">
      <AdminIcon name="chevronLeft" :size="14" />
      {{ locale.t('admin.backToWatches') }}
    </RouterLink>

    <div class="sw-admin-page-head">
      <div>
        <h1 class="sw-admin-page-title">
          {{ isEdit ? locale.t('admin.editWatch') : locale.t('admin.newWatch') }}
        </h1>
        <p class="sw-admin-page-sub">{{ form.name || locale.t('admin.formBasicsSub') }}</p>
      </div>
    </div>

    <form class="sw-wf" @submit.prevent="submit">
      <div class="sw-wf__col">
        <section class="sw-admin-card sw-wf__card">
          <header class="sw-wf__card-head">
            <h2 class="sw-wf__card-title">{{ locale.t('admin.formBasics') }}</h2>
          </header>

          <div class="sw-admin-grid sw-admin-grid--2">
            <label class="sw-admin-field--wide">
              <span>{{ locale.t('admin.name') }}</span>
              <input v-model="form.name" type="text" required />
            </label>
            <label>
              <span>{{ locale.t('admin.reference') }}</span>
              <input v-model="form.reference" type="text" />
            </label>
            <label>
              <span>{{ locale.t('admin.type') }}</span>
              <select v-model="form.type">
                <option value="watch">{{ locale.t('admin.typeWatch') }}</option>
                <option value="accessory">{{ locale.t('admin.typeAccessory') }}</option>
              </select>
            </label>
            <label>
              <span>{{ locale.t('admin.brand') }}</span>
              <select v-model="form.brand" required>
                <option value="" disabled>{{ locale.t('admin.selectBrand') }}</option>
                <option v-for="b in brands" :key="b._id" :value="b._id">{{ b.name }}</option>
              </select>
            </label>
            <label>
              <span>{{ locale.t('admin.category') }}</span>
              <select v-model="form.category" required>
                <option value="" disabled>{{ locale.t('admin.selectCategory') }}</option>
                <option v-for="c in categories" :key="c._id" :value="c._id">{{ c.name }}</option>
              </select>
            </label>
            <label class="sw-admin-field--wide">
              <span>{{ locale.t('admin.collection') }}</span>
              <select v-model="form.collectionRef">
                <option value="">{{ locale.t('admin.none') }}</option>
                <option v-for="c in collections" :key="c._id" :value="c._id">{{ c.name }}</option>
              </select>
            </label>
          </div>
        </section>

        <section class="sw-admin-card sw-wf__card">
          <header class="sw-wf__card-head">
            <h2 class="sw-wf__card-title">{{ locale.t('admin.formCopy') }}</h2>
            <p class="sw-wf__card-sub">{{ locale.t('admin.formCopySub') }}</p>
          </header>

          <label>
            <span>{{ locale.t('admin.shortDescription') }}</span>
            <input v-model="form.shortDescription" type="text" />
          </label>
          <label>
            <span>{{ locale.t('admin.fullDescription') }}</span>
            <textarea v-model="form.description" rows="5" />
          </label>

          <TranslationFields
            v-model="form.translations"
            :fields="translationFields"
            :base="{
              name: form.name,
              shortDescription: form.shortDescription,
              description: form.description,
            }"
          />
        </section>

        <section class="sw-admin-card sw-wf__card">
          <header class="sw-wf__card-head">
            <h2 class="sw-wf__card-title">{{ locale.t('admin.formSpecs') }}</h2>
          </header>

          <div class="sw-admin-grid sw-admin-grid--2">
            <label>
              <span>{{ locale.t('admin.movement') }}</span>
              <input v-model="form.movement" type="text" />
            </label>
            <label>
              <span>{{ locale.t('admin.caseMaterial') }}</span>
              <input v-model="form.caseMaterial" type="text" />
            </label>
            <label>
              <span>{{ locale.t('admin.caseSize') }}</span>
              <input v-model="form.caseSize" type="text" />
            </label>
            <label>
              <span>{{ locale.t('admin.dial') }}</span>
              <input v-model="form.dial" type="text" />
            </label>
            <label>
              <span>{{ locale.t('admin.bracelet') }}</span>
              <input v-model="form.bracelet" type="text" />
            </label>
            <label>
              <span>{{ locale.t('admin.waterResistance') }}</span>
              <input v-model="form.waterResistance" type="text" />
            </label>
          </div>
        </section>

        <section class="sw-admin-card sw-wf__card">
          <header class="sw-wf__card-head">
            <h2 class="sw-wf__card-title">{{ locale.t('admin.formMedia') }}</h2>
          </header>

          <p v-if="otherVariants.length" class="sw-wf__notice">
            <AdminIcon name="info" :size="15" />
            <span>{{ locale.t('admin.otherVariants') }}</span>
          </p>

          <div class="sw-wf__media-block">
            <span class="sw-wf__media-label">{{ locale.t('admin.images') }}</span>
            <div v-if="form.images.length" class="sw-wf__media-list">
              <div v-for="(img, i) in form.images" :key="img + i" class="sw-wf__media-item">
                <img :src="resolveMediaUrl(img)" alt="" />
                <button
                  class="sw-wf__media-remove"
                  type="button"
                  :aria-label="locale.t('admin.remove')"
                  @click="removeImage(i)"
                >
                  <AdminIcon name="close" :size="12" />
                </button>
              </div>
            </div>
            <MediaUploader
              :label="locale.t('admin.uploadImage')"
              accept="image/jpeg,image/png,image/webp,image/avif"
              @uploaded="(r) => onImageUploaded(r.url)"
            />
          </div>

          <div class="sw-wf__media-block">
            <span class="sw-wf__media-label">{{ locale.t('admin.videos') }}</span>
            <div v-if="form.videos.length" class="sw-wf__media-list">
              <div v-for="(vid, i) in form.videos" :key="vid + i" class="sw-wf__media-item">
                <video :src="resolveMediaUrl(vid)" muted />
                <button
                  class="sw-wf__media-remove"
                  type="button"
                  :aria-label="locale.t('admin.remove')"
                  @click="removeVideo(i)"
                >
                  <AdminIcon name="close" :size="12" />
                </button>
              </div>
            </div>
            <MediaUploader
              :label="locale.t('admin.uploadVideo')"
              accept="video/mp4,video/webm"
              @uploaded="(r) => onVideoUploaded(r.url)"
            />
          </div>
        </section>
      </div>

      <aside class="sw-wf__side">
        <section class="sw-admin-card sw-wf__card">
          <header class="sw-wf__card-head">
            <h2 class="sw-wf__card-title">{{ locale.t('admin.formPricing') }}</h2>
          </header>

          <div class="sw-wf__price-row">
            <label>
              <span>{{ locale.t('admin.price') }}</span>
              <input v-model.number="form.price" type="number" min="0" required />
            </label>
            <label class="sw-wf__currency">
              <span>{{ locale.t('admin.currency') }}</span>
              <input v-model="form.currency" type="text" />
            </label>
          </div>
          <label>
            <span>{{ locale.t('admin.availability') }}</span>
            <select v-model="form.availability">
              <option value="in-stock">{{ locale.t('admin.inStock') }}</option>
              <option value="reserved">{{ locale.t('admin.reserved') }}</option>
              <option value="sold">{{ locale.t('admin.sold') }}</option>
              <option value="made-to-order">{{ locale.t('admin.madeToOrder') }}</option>
            </select>
          </label>
        </section>

        <section class="sw-admin-card sw-wf__card">
          <header class="sw-wf__card-head">
            <h2 class="sw-wf__card-title">{{ locale.t('admin.formFlags') }}</h2>
          </header>

          <label class="sw-admin-check sw-admin-check--boxed">
            <input v-model="form.isActive" type="checkbox" />
            <span>{{ locale.t('admin.activeOnSite') }}</span>
          </label>
          <label class="sw-admin-check sw-admin-check--boxed">
            <input v-model="form.featured" type="checkbox" />
            <span>{{ locale.t('admin.featured') }}</span>
          </label>
          <label class="sw-admin-check sw-admin-check--boxed">
            <input v-model="form.isNewArrival" type="checkbox" />
            <span>{{ locale.t('admin.newArrival') }}</span>
          </label>
        </section>

        <div class="sw-wf__actions">
          <p v-if="errorMessage" class="sw-admin-error">{{ errorMessage }}</p>
          <button class="sw-admin-btn sw-admin-btn--block" type="submit" :disabled="isSaving || isLoading">
            {{ isSaving ? locale.t('admin.saving') : locale.t('admin.save') }}
          </button>
          <RouterLink class="sw-admin-btn sw-admin-btn--ghost sw-admin-btn--block" to="/watches">
            {{ locale.t('admin.cancel') }}
          </RouterLink>
        </div>
      </aside>
    </form>
  </div>
</template>

<style scoped>
.sw-wf__back {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 14px;
  font-size: 0.82rem;
  font-weight: 500;
  color: var(--admin-text-muted);
  transition: color var(--dur-fast) var(--ease-out);
}

.sw-wf__back:hover {
  color: var(--admin-text);
}

.sw-wf {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  align-items: start;
  gap: 20px;
}

.sw-wf__col,
.sw-wf__side {
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-width: 0;
}

/* The side column follows the page while the long left column scrolls. */
.sw-wf__side {
  position: sticky;
  top: calc(var(--admin-header-h) + 20px);
}

.sw-wf__card {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 28px 32px;
}

.sw-wf__card-head {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-bottom: 18px;
  border-bottom: 1px solid var(--admin-border);
}

.sw-wf__card-title {
  font-size: 0.85rem;
  font-weight: 650;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--admin-text-muted);
}

.sw-wf__card-sub {
  font-size: 0.78rem;
  color: var(--admin-text-subtle);
  line-height: 1.5;
  text-transform: none;
  letter-spacing: 0;
}

.sw-wf__price-row {
  display: grid;
  grid-template-columns: 1fr 100px;
  gap: 16px;
}

.sw-wf__notice {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  padding: 11px 13px;
  border-radius: var(--radius-md);
  background: var(--admin-info-soft);
  color: var(--admin-info);
  font-size: 0.8rem;
  line-height: 1.55;
}

.sw-wf__notice svg {
  flex: none;
  margin-top: 1px;
}

.sw-wf__media-block {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sw-wf__media-label {
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--admin-text);
}

.sw-wf__media-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.sw-wf__media-item {
  position: relative;
  width: 96px;
  height: 96px;
}

.sw-wf__media-item img,
.sw-wf__media-item video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: var(--radius-md);
  border: 1px solid var(--admin-border);
}

.sw-wf__media-remove {
  position: absolute;
  top: -6px;
  right: -6px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: var(--radius-full);
  background: var(--admin-danger);
  color: #fff;
  box-shadow: var(--shadow-sm);
  transition: transform var(--dur-fast) var(--ease-out);
}

.sw-wf__media-remove:hover {
  transform: scale(1.1);
}

.sw-wf__actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 8px;
}

@media (max-width: 1080px) {
  .sw-wf {
    grid-template-columns: 1fr;
  }

  .sw-wf__side {
    position: static;
  }
}
</style>
