<script setup lang="ts">
/**
 * One "maison" plaque in the brand showcase. Idle state is the engraved brand
 * plaque; on hover (desktop) or tap (touch) it cross-dissolves into that
 * brand's own product photography, pulled from the same Watch records the
 * rest of the site already renders — no separate content model, just a
 * per-brand { brand, logo, name, watches[] } view over data that already
 * exists.
 */
import { ref, computed, useTemplateRef, watch } from 'vue';
import type { Brand, Watch } from '@/types/models';
import { useLocaleStore } from '@/stores/locale';
import { useInViewport } from '@/composables/useInViewport';
import { getBrandWatches } from '@/utils/brandWatches';
import { primaryImage } from '@/utils/format';
import SmartImage from '@/components/shared/SmartImage.vue';

interface Props {
  brand: Brand;
}

const props = defineProps<Props>();
const locale = useLocaleStore();

const watches = ref<Watch[]>([]);
const tapped = ref(false);

const rootEl = useTemplateRef<HTMLLIElement>('rootEl');
// Prefetched the moment the card scrolls into view, not on hover — by the
// time a pointer actually arrives the photograph is already in memory, so
// the reveal never waits on the network.
const { isVisible } = useInViewport(rootEl, { threshold: 0.15, rootMargin: '200px 0px' });

watch(
  isVisible,
  async (visible) => {
    if (!visible || watches.value.length) return;
    try {
      watches.value = await getBrandWatches(props.brand._id);
    } catch (err) {
      console.error('Failed to load watches for brand', err);
    }
  },
  { immediate: true },
);

const primaryWatch = computed(() => watches.value[0]);
const secondaryWatch = computed(() => watches.value[1]);

// Touch has no hover to drive the reveal, so the first tap on a coarse
// pointer previews in place; a second tap on the same card then follows the
// link through to the brand page.
function onLinkClick(event: MouseEvent) {
  if (!window.matchMedia('(hover: none)').matches) return;
  if (!tapped.value) {
    event.preventDefault();
    tapped.value = true;
  }
}
</script>

<template>
  <li ref="rootEl" class="sw-maison" :class="{ 'is-tapped': tapped }">
    <RouterLink
      :to="`/brands/${brand.slug}`"
      class="sw-maison__link"
      data-cursor="View"
      @click="onLinkClick"
    >
      <span class="sw-maison__frame">
        <span class="sw-maison__logo-layer">
          <SmartImage :src="brand.logo" :alt="brand.name" sizes="(max-width: 560px) 46vw, 280px" />
        </span>

        <span v-if="primaryWatch" class="sw-maison__watch-layer" :class="{ 'has-two': secondaryWatch }">
          <span class="sw-maison__shot">
            <SmartImage :src="primaryImage(primaryWatch)" :alt="primaryWatch.name" object-fit="contain" sizes="(max-width: 560px) 46vw, 280px" />
          </span>
          <span v-if="secondaryWatch" class="sw-maison__shot sw-maison__shot--alt">
            <SmartImage :src="primaryImage(secondaryWatch)" :alt="secondaryWatch.name" object-fit="contain" sizes="(max-width: 560px) 46vw, 280px" />
          </span>
        </span>

        <span class="sw-maison__scrim" aria-hidden="true" />
      </span>

      <span class="sw-maison__meta">
        <span class="sw-label sw-maison__name">{{ brand.name }}</span>
        <span class="sw-maison__cta">
          {{ locale.t('category.discover') }} <span class="sw-maison__cta-arrow" aria-hidden="true">&rarr;</span>
        </span>
      </span>
    </RouterLink>
  </li>
</template>

<style scoped>
.sw-maison__link {
  position: relative;
  display: block;
}

.sw-maison__frame {
  position: relative;
  display: block;
  /* Every layer inside is absolutely positioned, so the frame itself is what
     gives the card its height. */
  aspect-ratio: 4 / 5;
  overflow: hidden;
  /* Fixed dark plaque regardless of site theme — a maison showcase reads as a
     gallery case, not a page-background element. */
  background: #141311;
  border: 1px solid rgba(253, 252, 250, 0.09);
  transition: border-color 0.5s var(--ease-editorial);
}

.sw-maison__link:hover .sw-maison__frame,
.sw-maison__link:focus-visible .sw-maison__frame,
.sw-maison.is-tapped .sw-maison__frame {
  border-color: rgba(253, 252, 250, 0.22);
}

/* ---- Logo state (idle) ---- */
.sw-maison__logo-layer {
  position: absolute;
  inset: 0;
  transform: scale(1);
  transition:
    opacity 0.4s var(--ease-editorial),
    transform 0.4s var(--ease-editorial);
}

.sw-maison__logo-layer :deep(.sw-smart-image),
.sw-maison__logo-layer :deep(.sw-smart-image__img) {
  height: 100%;
}

/* Recedes to a faint backdrop rather than disappearing outright — the plaque
   is still there, just no longer the subject. */
.sw-maison__link:hover .sw-maison__logo-layer,
.sw-maison__link:focus-visible .sw-maison__logo-layer,
.sw-maison.is-tapped .sw-maison__logo-layer {
  opacity: 0.16;
  transform: scale(0.97);
  transition:
    opacity 0.4s var(--ease-editorial),
    transform 0.4s var(--ease-editorial);
}

/* ---- Watch state (revealed) ---- */
.sw-maison__watch-layer {
  position: absolute;
  inset: 8%;
  opacity: 0;
  transform: scale(1.06);
  transition:
    opacity 0.4s var(--ease-editorial),
    transform 0.4s var(--ease-editorial);
}

/* Entering is deliberately slower than leaving, and starts a beat after the
   logo has already begun to recede — logo fades down, then the watch rises
   to meet it, never two things moving at once. */
.sw-maison__link:hover .sw-maison__watch-layer,
.sw-maison__link:focus-visible .sw-maison__watch-layer,
.sw-maison.is-tapped .sw-maison__watch-layer {
  opacity: 1;
  transform: scale(1);
  transition:
    opacity 0.65s var(--ease-editorial) 0.16s,
    transform 0.75s var(--ease-editorial) 0.16s;
}

.sw-maison__shot {
  position: absolute;
  inset: 0;
}

.sw-maison__shot :deep(.sw-smart-image),
.sw-maison__shot :deep(.sw-smart-image__img) {
  height: 100%;
}

/* A slower, independent creep on the photograph itself, layered under the
   frame's own reveal — the two-stage motion is what reads as parallax rather
   than a single flat zoom. */
.sw-maison__shot :deep(.sw-smart-image__img) {
  transition: transform 2.2s var(--ease-editorial);
}

.sw-maison__link:hover .sw-maison__shot :deep(.sw-smart-image__img),
.sw-maison__link:focus-visible .sw-maison__shot :deep(.sw-smart-image__img),
.sw-maison.is-tapped .sw-maison__shot :deep(.sw-smart-image__img) {
  transform: scale(1.035);
}

.sw-maison__shot--alt {
  opacity: 0;
}

/* Only the second photograph animates; the first stays put as the base
   layer, so a brand with a single watch never runs the keyframe at all. */
.sw-maison__link:hover .sw-maison__watch-layer.has-two .sw-maison__shot--alt,
.sw-maison__link:focus-visible .sw-maison__watch-layer.has-two .sw-maison__shot--alt,
.sw-maison.is-tapped .sw-maison__watch-layer.has-two .sw-maison__shot--alt {
  animation: sw-maison-crossfade 7s var(--ease-editorial) infinite;
}

@keyframes sw-maison-crossfade {
  0%,
  38% {
    opacity: 0;
  }
  55%,
  83% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}

.sw-maison__scrim {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(6, 6, 6, 0) 58%, rgba(6, 6, 6, 0.86) 100%);
  pointer-events: none;
}

.sw-maison__meta {
  position: absolute;
  left: 18px;
  right: 18px;
  bottom: 16px;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  color: var(--sw-white);
}

.sw-maison__name {
  font-size: 0.6875rem;
  letter-spacing: 0.2em;
}

.sw-maison__cta {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  font-family: var(--font-sans);
  font-size: 0.625rem;
  font-weight: 500;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  white-space: nowrap;
  color: rgba(253, 252, 250, 0.86);
  opacity: 0;
  transform: translateY(4px);
  transition:
    opacity 0.4s var(--ease-editorial),
    transform 0.4s var(--ease-editorial);
}

.sw-maison__link:hover .sw-maison__cta,
.sw-maison__link:focus-visible .sw-maison__cta,
.sw-maison.is-tapped .sw-maison__cta {
  opacity: 1;
  transform: none;
  transition:
    opacity 0.55s var(--ease-editorial) 0.2s,
    transform 0.55s var(--ease-editorial) 0.2s;
}

.sw-maison__cta-arrow {
  display: inline-block;
  transition: transform 0.55s var(--ease-editorial);
}

.sw-maison__link:hover .sw-maison__cta-arrow,
.sw-maison.is-tapped .sw-maison__cta-arrow {
  transform: translateX(3px);
}

/* Touch has no hover to drive the CTA fade-in, and no pointer resting on the
   card to justify hiding it — show it plainly once tapped. */
@media (hover: none) {
  .sw-maison.is-tapped .sw-maison__cta {
    opacity: 1;
    transform: none;
  }
}
</style>
