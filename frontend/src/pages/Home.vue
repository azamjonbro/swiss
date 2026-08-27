<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import type { Watch, Brand } from '@/types/models';
import { fetchWatches } from '@/services/watches';
import { fetchBrands } from '@/services/brands';
import { useLocaleStore } from '@/stores/locale';

import HeroSection from '@/components/home/HeroSection.vue';
import BrandIntro from '@/components/home/BrandIntro.vue';
import FeaturedWatches from '@/components/home/FeaturedWatches.vue';
import WatchHousesSection from '@/components/home/WatchHousesSection.vue';
import BrandStory from '@/components/home/BrandStory.vue';
import CraftsmanshipSection from '@/components/home/CraftsmanshipSection.vue';
import EditorialStatement from '@/components/home/EditorialStatement.vue';
import BrandSection from '@/components/home/BrandSection.vue';
import CtaSection from '@/components/home/CtaSection.vue';

const locale = useLocaleStore();
const featuredWatches = ref<Watch[]>([]);
const brands = ref<Brand[]>([]);
const isLoading = ref(true);

async function load() {
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
}

onMounted(load);
watch(() => locale.lang, load);
</script>

<template>
  <div class="sw-home">
    <HeroSection />

    <!-- statement → brands → selection → filmstrip → story → craft → campaign -->
    <BrandIntro />

    <!-- The brands sit directly under the opening statement rather than at the
         foot of the page: "time is felt, not measured" is an argument about
         provenance, and the houses behind the pieces are the evidence for it.
         Buried at the bottom, past the campaign band, almost nobody reached
         them. -->
    <BrandSection v-if="brands.length" :brands="brands" />

    <FeaturedWatches v-if="featuredWatches.length" :watches="featuredWatches" />

    <WatchHousesSection v-if="brands.length" :brands="brands" />

    <BrandStory />

    <CraftsmanshipSection />

    <EditorialStatement />

    <CtaSection />
  </div>
</template>
