<script setup lang="ts">
import { ref, onMounted } from 'vue';
import type { Watch, Brand } from '@/types/models';
import { fetchWatches } from '@/services/watches';
import { fetchBrands } from '@/services/brands';

import HeroSection from '@/components/home/HeroSection.vue';
import BrandIntro from '@/components/home/BrandIntro.vue';
import FeaturedWatches from '@/components/home/FeaturedWatches.vue';
import WatchHousesSection from '@/components/home/WatchHousesSection.vue';
import BrandStory from '@/components/home/BrandStory.vue';
import CraftsmanshipSection from '@/components/home/CraftsmanshipSection.vue';
import EditorialStatement from '@/components/home/EditorialStatement.vue';
import BrandSection from '@/components/home/BrandSection.vue';
import CtaSection from '@/components/home/CtaSection.vue';

const featuredWatches = ref<Watch[]>([]);
const brands = ref<Brand[]>([]);
const isLoading = ref(true);

onMounted(async () => {
  try {
    const [watchesData, brandsData] = await Promise.all([
      // Three pieces is the whole featured selection — see FeaturedWatches.
      fetchWatches({ featured: true, limit: 3 }),
      fetchBrands(),
    ]);
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

    <!-- statement → selection → houses → story → craft → campaign → maisons -->
    <BrandIntro />

    <FeaturedWatches v-if="featuredWatches.length" :watches="featuredWatches" />

    <WatchHousesSection v-if="brands.length" :brands="brands" />

    <BrandStory />

    <CraftsmanshipSection />

    <EditorialStatement />

    <BrandSection v-if="brands.length" :brands="brands" />

    <CtaSection />
  </div>
</template>
