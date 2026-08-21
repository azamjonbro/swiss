<script setup lang="ts">
import { ref, onMounted } from 'vue';
import type { Watch, Category, Brand } from '@/types/models';
import { fetchWatches } from '@/services/watches';
import { fetchCategories } from '@/services/categories';
import { fetchBrands } from '@/services/brands';
import { useLocaleStore } from '@/stores/locale';

import HeroSection from '@/components/home/HeroSection.vue';
import BrandIntro from '@/components/home/BrandIntro.vue';
import HorizontalCategorySection from '@/components/category/HorizontalCategorySection.vue';
import FeaturedWatches from '@/components/home/FeaturedWatches.vue';
import EditorialSection from '@/components/home/EditorialSection.vue';
import BrandSection from '@/components/home/BrandSection.vue';
import CtaSection from '@/components/home/CtaSection.vue';

const locale = useLocaleStore();
const categories = ref<Category[]>([]);
const featuredWatches = ref<Watch[]>([]);
const brands = ref<Brand[]>([]);
const isLoading = ref(true);

const provenanceImage = '/images/swisswatch_provenance.jpg';
const conciergeImage = '/images/swisswatch_concierge.jpg';

onMounted(async () => {
  try {
    const [categoriesData, watchesData, brandsData] = await Promise.all([
      fetchCategories(),
      fetchWatches({ featured: true, limit: 4 }),
      fetchBrands(),
    ]);
    categories.value = categoriesData;
    featuredWatches.value = watchesData.items;
    brands.value = brandsData;
  } finally {
    isLoading.value = false;
  }
});
</script>

<template>
  <div class="sw-home">
    <HeroSection />
    <BrandIntro />

    <HorizontalCategorySection v-if="categories.length" :categories="categories" />

    <FeaturedWatches v-if="featuredWatches.length" :watches="featuredWatches" />

    <EditorialSection
      :eyebrow="locale.t('home.provenanceEyebrow')"
      :title="locale.t('home.provenanceTitle')"
      :body="locale.t('home.provenanceBody')"
      :image="provenanceImage"
      :cta-label="locale.t('home.provenanceCta')"
      cta-to="/about"
    />

    <EditorialSection
      :eyebrow="locale.t('home.conciergeEyebrow')"
      :title="locale.t('home.conciergeTitle')"
      :body="locale.t('home.conciergeBody')"
      :image="conciergeImage"
      :cta-label="locale.t('home.conciergeCta')"
      cta-to="/contact"
      reverse
    />

    <BrandSection v-if="brands.length" :brands="brands" />

    <CtaSection />
  </div>
</template>
