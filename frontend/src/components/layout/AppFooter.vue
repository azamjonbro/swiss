<script setup lang="ts">
import { useLocaleStore } from '@/stores/locale';
import { site } from '@/utils/seo';
import { telHref, STORES_PATH } from '@/seo/schema.mjs';
import { hasStoreLocations } from '@/data/locations';

const locale = useLocaleStore();
const year = new Date().getFullYear();

// Contact details come from VITE_CONTACT_EMAIL / VITE_CONTACT_PHONE and are
// allowed to be unset. Unset renders nothing at all — a placeholder number in
// a footer is read as a real one, by visitors and by structured-data parsers.
const email = site.contactEmail ?? '';
const phone = site.contactPhone ?? '';
</script>

<template>
  <footer class="sw-footer">
    <div class="sw-footer__top">
      <RouterLink to="/" class="sw-footer__logo">SwissWatch Premium</RouterLink>

      <nav class="sw-footer__col">
        <span class="sw-eyebrow">{{ locale.t('footer.explore') }}</span>
        <RouterLink to="/collections">{{ locale.t('nav.collections') }}</RouterLink>
        <RouterLink to="/watches">{{ locale.t('nav.watches') }}</RouterLink>
        <RouterLink to="/brands">{{ locale.t('nav.brands') }}</RouterLink>
      </nav>

      <nav class="sw-footer__col">
        <span class="sw-eyebrow">{{ locale.t('footer.maison') }}</span>
        <RouterLink to="/about">{{ locale.t('footer.about') }}</RouterLink>
        <RouterLink to="/contact">{{ locale.t('footer.contact') }}</RouterLink>
        <!-- Linked only once a real boutique exists; the route is not even
             registered while locations.json is empty. -->
        <RouterLink v-if="hasStoreLocations" :to="STORES_PATH">{{ locale.t('stores.title') }}</RouterLink>
      </nav>

      <div class="sw-footer__col">
        <span class="sw-eyebrow">{{ locale.t('footer.connect') }}</span>
        <a href="https://instagram.com/swisswatch_premium" target="_blank" rel="noopener">{{ locale.t('footer.instagram') }}</a>
        <a v-if="phone" :href="telHref(phone)">{{ phone }}</a>
        <a v-if="email" :href="`mailto:${email}`">{{ email }}</a>
      </div>
    </div>

    <div class="sw-footer__bottom">
      <p>&copy; {{ year }} SwissWatch Premium. {{ locale.t('footer.rights') }}</p>
      <p class="sw-footer__tagline">{{ locale.t('footer.tagline') }}</p>
    </div>
  </footer>
</template>

<style scoped>
.sw-footer {
  background: var(--sw-black);
  color: var(--sw-gray-200);
  padding: 96px var(--container-pad) 32px;
}

.sw-footer__top {
  display: grid;
  grid-template-columns: 1.4fr 1fr 1fr 1fr;
  gap: 40px;
  padding-bottom: 64px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.14);
}

.sw-footer__logo {
  font-family: var(--font-serif);
  font-size: 1.75rem;
  color: var(--sw-white);
}

.sw-footer__col {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.sw-footer__col .sw-eyebrow {
  color: var(--sw-gray-600);
  margin-bottom: 4px;
}

.sw-footer__col a {
  font-size: 0.9rem;
  transition: color var(--dur-fast) var(--ease-out);
}

.sw-footer__col a:hover {
  color: var(--sw-white);
}

.sw-footer__bottom {
  display: flex;
  justify-content: space-between;
  padding-top: 28px;
  font-size: 0.75rem;
  color: var(--sw-gray-600);
}

.sw-footer__tagline {
  font-family: var(--font-serif);
  font-style: italic;
}

@media (max-width: 768px) {
  .sw-footer__top {
    grid-template-columns: 1fr 1fr;
    row-gap: 40px;
  }

  .sw-footer__bottom {
    flex-direction: column;
    gap: 8px;
  }
}
</style>
