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
} from '@/types/models';
import { adminFetchWatch, adminCreateWatch, adminUpdateWatch } from '@/services/watches';
import { adminFetchCategories } from '@/services/categories';
import { adminFetchBrands } from '@/services/brands';
import { adminFetchCollections } from '@/services/collections';
import MediaUploader from '@/components/admin/MediaUploader.vue';
import TranslationFields from '@/components/admin/TranslationFields.vue';
import { resolveMediaUrl } from '@/utils/media';

const route = useRoute();
const router = useRouter();

const isEdit = computed(() => Boolean(route.params.id));

const categories = ref<Category[]>([]);
const brands = ref<Brand[]>([]);
const collections = ref<Collection[]>([]);

const TRANSLATION_FIELDS: TranslationField[] = [
  { key: 'name', label: 'Name' },
  { key: 'shortDescription', label: 'Short Description' },
  { key: 'description', label: 'Full Description', type: 'textarea', rows: 4 },
];

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
const errorMessage = ref('');
// Additional colourways beyond the one this simplified form edits — carried
// through untouched so saving never drops a product's other variants.
const otherVariants = ref<Watch['variants']>([]);

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
  otherVariants.value = watch.variants?.slice(1) ?? [];
}

onMounted(async () => {
  const [categoriesData, brandsData, collectionsData] = await Promise.all([
    adminFetchCategories(),
    adminFetchBrands(),
    adminFetchCollections(),
  ]);
  categories.value = categoriesData;
  brands.value = brandsData;
  collections.value = collectionsData;

  if (isEdit.value) await loadWatch(route.params.id as string);
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
    errorMessage.value = 'Name, brand, category, and price are required.';
    return;
  }

  isSaving.value = true;
  try {
    const { images, videos, ...rest } = form.value;
    const primaryVariant = { colorSlug: 'default', colorLabel: '', images, videos };
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
    router.push('/watches');
  } catch {
    errorMessage.value = 'Could not save this watch. Please check the fields and try again.';
  } finally {
    isSaving.value = false;
  }
}
</script>

<template>
  <div class="sw-admin-watch-form">
    <h1 class="sw-admin-page-title">{{ isEdit ? 'Edit Watch' : 'New Watch' }}</h1>

    <form class="sw-admin-card sw-admin-watch-form__form" @submit.prevent="submit">
      <div class="sw-admin-watch-form__grid">
        <label>
          <span>Name</span>
          <input v-model="form.name" type="text" required />
        </label>
        <label>
          <span>Reference</span>
          <input v-model="form.reference" type="text" />
        </label>
        <label>
          <span>Brand</span>
          <select v-model="form.brand" required>
            <option value="" disabled>Select brand</option>
            <option v-for="b in brands" :key="b._id" :value="b._id">{{ b.name }}</option>
          </select>
        </label>
        <label>
          <span>Category</span>
          <select v-model="form.category" required>
            <option value="" disabled>Select category</option>
            <option v-for="c in categories" :key="c._id" :value="c._id">{{ c.name }}</option>
          </select>
        </label>
        <label>
          <span>Collection</span>
          <select v-model="form.collectionRef">
            <option value="">None</option>
            <option v-for="c in collections" :key="c._id" :value="c._id">{{ c.name }}</option>
          </select>
        </label>
        <label>
          <span>Type</span>
          <select v-model="form.type">
            <option value="watch">Watch</option>
            <option value="accessory">Accessory</option>
          </select>
        </label>
        <label>
          <span>Price</span>
          <input v-model.number="form.price" type="number" min="0" required />
        </label>
        <label>
          <span>Currency</span>
          <input v-model="form.currency" type="text" />
        </label>
        <label>
          <span>Availability</span>
          <select v-model="form.availability">
            <option value="in-stock">In Stock</option>
            <option value="reserved">Reserved</option>
            <option value="sold">Sold</option>
            <option value="made-to-order">Made to Order</option>
          </select>
        </label>
      </div>

      <label>
        <span>Short Description</span>
        <input v-model="form.shortDescription" type="text" />
      </label>
      <label>
        <span>Full Description</span>
        <textarea v-model="form.description" rows="4" />
      </label>

      <TranslationFields
        v-model="form.translations"
        :fields="TRANSLATION_FIELDS"
        :base="{
          name: form.name,
          shortDescription: form.shortDescription,
          description: form.description,
        }"
      />

      <div class="sw-admin-watch-form__grid">
        <label>
          <span>Movement</span>
          <input v-model="form.movement" type="text" />
        </label>
        <label>
          <span>Case Material</span>
          <input v-model="form.caseMaterial" type="text" />
        </label>
        <label>
          <span>Case Size</span>
          <input v-model="form.caseSize" type="text" />
        </label>
        <label>
          <span>Dial</span>
          <input v-model="form.dial" type="text" />
        </label>
        <label>
          <span>Bracelet</span>
          <input v-model="form.bracelet" type="text" />
        </label>
        <label>
          <span>Water Resistance</span>
          <input v-model="form.waterResistance" type="text" />
        </label>
      </div>

      <div class="sw-admin-watch-form__checks">
        <label class="sw-admin-watch-form__check">
          <input v-model="form.featured" type="checkbox" />
          <span>Featured</span>
        </label>
        <label class="sw-admin-watch-form__check">
          <input v-model="form.isNewArrival" type="checkbox" />
          <span>New Arrival</span>
        </label>
        <label class="sw-admin-watch-form__check">
          <input v-model="form.isActive" type="checkbox" />
          <span>Active (visible on site)</span>
        </label>
      </div>

      <p v-if="otherVariants.length" class="sw-admin-watch-form__notice">
        This product has {{ otherVariants.length }} additional colorway(s) not editable here — they're preserved
        as-is when you save. Use the seed data or a database tool to manage other variants.
      </p>

      <div class="sw-admin-watch-form__media">
        <div>
          <span class="sw-label">Images{{ otherVariants.length ? ' (primary colorway)' : '' }}</span>
          <div class="sw-admin-watch-form__media-list">
            <div v-for="(img, i) in form.images" :key="img + i" class="sw-admin-watch-form__media-item">
              <img :src="resolveMediaUrl(img)" alt="" />
              <button type="button" @click="removeImage(i)">Remove</button>
            </div>
          </div>
          <MediaUploader
            label="Upload Image"
            accept="image/jpeg,image/png,image/webp,image/avif"
            @uploaded="(r) => onImageUploaded(r.url)"
          />
        </div>

        <div>
          <span class="sw-label">Videos</span>
          <div class="sw-admin-watch-form__media-list">
            <div v-for="(vid, i) in form.videos" :key="vid + i" class="sw-admin-watch-form__media-item">
              <video :src="resolveMediaUrl(vid)" muted />
              <button type="button" @click="removeVideo(i)">Remove</button>
            </div>
          </div>
          <MediaUploader label="Upload Video" accept="video/mp4,video/webm" @uploaded="(r) => onVideoUploaded(r.url)" />
        </div>
      </div>

      <p v-if="errorMessage" class="sw-admin-watch-form__error">{{ errorMessage }}</p>

      <div class="sw-admin-watch-form__actions">
        <button class="sw-admin-btn" type="submit" :disabled="isSaving">
          {{ isSaving ? 'Saving…' : 'Save Watch' }}
        </button>
        <RouterLink class="sw-admin-btn sw-admin-btn--ghost" to="/watches">Cancel</RouterLink>
      </div>
    </form>
  </div>
</template>

<style scoped>
.sw-admin-page-title {
  font-family: var(--font-sans);
  font-weight: 700;
  font-size: 1.5rem;
  letter-spacing: -0.01em;
  margin-bottom: 20px;
}

.sw-admin-watch-form__form {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 900px;
}

.sw-admin-watch-form__grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.sw-admin-watch-form__checks {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
}

.sw-admin-watch-form__check {
  flex-direction: row;
  align-items: center;
  gap: 8px;
}

.sw-admin-watch-form__media {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  padding-top: 12px;
  border-top: 1px solid var(--admin-border);
}

.sw-admin-watch-form__media-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: 10px 0;
}

.sw-admin-watch-form__media-item {
  position: relative;
  width: 84px;
}

.sw-admin-watch-form__media-item img,
.sw-admin-watch-form__media-item video {
  width: 84px;
  height: 84px;
  object-fit: cover;
  border-radius: var(--radius-md);
  border: 1px solid var(--admin-border);
}

.sw-admin-watch-form__media-item button {
  font-size: 0.65rem;
  color: #a3313f;
  text-decoration: underline;
}

.sw-admin-watch-form__notice {
  font-size: 0.8rem;
  color: var(--admin-text-muted, #6b6b6b);
  padding: 10px 12px;
  background: var(--admin-surface-alt, #f5f4f1);
  border-radius: var(--radius-md);
}

.sw-admin-watch-form__error {
  color: #a3313f;
  font-size: 0.85rem;
}

.sw-admin-watch-form__actions {
  display: flex;
  gap: 12px;
}

@media (max-width: 720px) {
  .sw-admin-watch-form__grid,
  .sw-admin-watch-form__media {
    grid-template-columns: 1fr;
  }
}
</style>
