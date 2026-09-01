<script setup lang="ts">
import { useLocaleStore } from '@/stores/locale';
import SmartImage from '@/components/shared/SmartImage.vue';

interface Props {
  /** Swap in real campaign photography here — nothing else needs to change. */
  image?: string;
}

withDefaults(defineProps<Props>(), { image: '/images/sainthonore_monceau_steel.jpg' });

const locale = useLocaleStore();
</script>

<template>
  <section class="sw-statement-band">
    <div class="sw-statement-band__media">
      <SmartImage :src="image" :alt="locale.t('home.statementAlt')" />
      <div class="sw-statement-band__grade" aria-hidden="true" />
    </div>

    <div class="sw-statement-band__content">
      <p v-reveal="{ y: 30 }" class="sw-statement sw-statement-band__text">
        {{ locale.t('home.statement') }}
      </p>
    </div>
  </section>
</template>

<style scoped>
.sw-statement-band {
  position: relative;
  min-height: min(100svh, 900px);
  display: grid;
  place-items: center;
  overflow: hidden;
  background: var(--sw-obsidian);
  color: var(--sw-white);
  /* Full-bleed regardless of any container it is dropped into. */
  padding: clamp(120px, 18vh, 220px) var(--container-pad);
}

.sw-statement-band__media {
  position: absolute;
  inset: 0;
}

.sw-statement-band__media :deep(.sw-smart-image),
.sw-statement-band__media :deep(.sw-smart-image__img) {
  height: 100%;
}

/* A macro crop, not the establishing shot: the frame pushes in on the case and
   the tourbillon so the campaign band reads as its own photograph. The origin
   follows the piece in the source frame — it stands centred, its dial a little
   above the middle. */
.sw-statement-band__media :deep(.sw-smart-image__img) {
  object-position: 50% 46%;
  transform: scale(1.45);
  transform-origin: 50% 46%;
  filter: contrast(1.05) saturate(0.86) brightness(0.8);
}

.sw-statement-band__grade {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(120% 100% at 50% 50%, rgba(6, 6, 6, 0.22) 0%, rgba(6, 6, 6, 0.68) 100%),
    linear-gradient(180deg, rgba(6, 6, 6, 0.45) 0%, rgba(6, 6, 6, 0.1) 40%, rgba(6, 6, 6, 0.5) 100%);
}

.sw-statement-band__content {
  position: relative;
  z-index: 1;
  text-align: center;
}

.sw-statement-band__text {
  /* Wide tracking is what turns two words into a campaign line. */
  letter-spacing: 0.06em;
  max-width: 16ch;
  margin-inline: auto;
}

@media (max-width: 640px) {
  .sw-statement-band {
    min-height: 76svh;
  }

  .sw-statement-band__text {
    letter-spacing: 0.04em;
  }
}
</style>
