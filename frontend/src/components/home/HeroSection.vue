<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { gsap } from '@/animations/gsap';
import { prefersReducedMotion } from '@/composables/useReducedMotion';
import { scrollTo } from '@/composables/useLenis';
import { useLocaleStore } from '@/stores/locale';
import SmartImage from '@/components/shared/SmartImage.vue';

const locale = useLocaleStore();
const heroImage = '/images/swisswatch_hero.jpg';

const mediaEl = ref<HTMLElement | null>(null);
const frameEl = ref<HTMLElement | null>(null);
const eyebrowEl = ref<HTMLElement | null>(null);
const titleEl = ref<HTMLElement | null>(null);
const subEl = ref<HTMLElement | null>(null);
const ctaEl = ref<HTMLElement | null>(null);
const contentEl = ref<HTMLElement | null>(null);
const scrollHintEl = ref<HTMLElement | null>(null);

// Parallax budget, in px. Deliberately below the threshold of conscious
// notice — the frame reads as alive, not as an effect.
const MEDIA_SHIFT = 6;
const CONTENT_SHIFT = 2;

let tl: gsap.core.Timeline | null = null;
let parallaxEnabled = false;
let moveMedia: { x: (v: number) => void; y: (v: number) => void } | null = null;
let moveContent: { x: (v: number) => void; y: (v: number) => void } | null = null;

function onPointerMove(event: PointerEvent) {
  if (!parallaxEnabled || event.pointerType !== 'mouse') return;
  // -1 … 1 from the centre of the viewport
  const nx = (event.clientX / window.innerWidth) * 2 - 1;
  const ny = (event.clientY / window.innerHeight) * 2 - 1;

  moveMedia?.x(-nx * MEDIA_SHIFT);
  moveMedia?.y(-ny * MEDIA_SHIFT);
  moveContent?.x(nx * CONTENT_SHIFT);
  moveContent?.y(ny * CONTENT_SHIFT);
}

function playIntro() {
  tl = gsap.timeline({ defaults: { ease: 'power2.out' } });

  // Sequence: image → eyebrow → title → subtitle → CTA → scroll cue.
  // No bounce, no overshoot; each step overlaps the last so the whole
  // entrance reads as one slow breath rather than six separate moves.
  tl.fromTo(mediaEl.value, { opacity: 0 }, { opacity: 1, duration: 1.2 })
    .fromTo(frameEl.value, { scale: 1.07 }, { scale: 1, duration: 2.2, ease: 'power1.out' }, 0)
    .fromTo(eyebrowEl.value, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.9 }, 0.45)
    .fromTo(titleEl.value, { opacity: 0, y: 34 }, { opacity: 1, y: 0, duration: 1.2 }, 0.62)
    .fromTo(subEl.value, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 1.0 }, 0.9)
    .fromTo(ctaEl.value, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.9 }, 1.08)
    .fromTo(scrollHintEl.value, { opacity: 0 }, { opacity: 1, duration: 0.9 }, 1.25);
}

function enableParallax() {
  // Pointer parallax is desktop-only: it costs nothing on a mouse and is
  // meaningless (and janky) on touch.
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if (!window.matchMedia('(min-width: 900px)').matches) return;

  parallaxEnabled = true;
  moveMedia = {
    x: gsap.quickTo(frameEl.value, 'x', { duration: 1.4, ease: 'power3.out' }),
    y: gsap.quickTo(frameEl.value, 'y', { duration: 1.4, ease: 'power3.out' }),
  };
  moveContent = {
    x: gsap.quickTo(contentEl.value, 'x', { duration: 1.8, ease: 'power3.out' }),
    y: gsap.quickTo(contentEl.value, 'y', { duration: 1.8, ease: 'power3.out' }),
  };
  window.addEventListener('pointermove', onPointerMove, { passive: true });
}

onMounted(() => {
  if (prefersReducedMotion()) return;

  // Lock the from-state on the same tick as mount. The timeline itself may not
  // start for another second (see below), and without this the copy would be
  // painted at full opacity first and then snap back to hidden.
  gsap.set([mediaEl.value, eyebrowEl.value, titleEl.value, subEl.value, ctaEl.value, scrollHintEl.value], {
    opacity: 0,
  });

  // Hold the entrance until the preloader has cleared, otherwise the whole
  // sequence plays behind an opaque panel and the visitor never sees it.
  if (document.body.classList.contains('sw-loading')) {
    window.addEventListener('sw:preloader-done', playIntro, { once: true });
  } else {
    playIntro();
  }

  enableParallax();
});

onUnmounted(() => {
  window.removeEventListener('sw:preloader-done', playIntro);
  window.removeEventListener('pointermove', onPointerMove);
  tl?.kill();
});

function handleDiscover() {
  scrollTo('#featured-collection');
}
</script>

<template>
  <section class="sw-hero">
    <div ref="mediaEl" class="sw-hero__media">
      <div ref="frameEl" class="sw-hero__frame">
        <SmartImage :src="heroImage" :alt="locale.t('home.heroImageAlt')" eager />
      </div>
      <!-- Three separate grades rather than one heavy scrim: the left edge is
           weighted for the type, the base carries the CTA, and a soft vignette
           keeps the eye on the case. The watch itself is never crushed. -->
      <div class="sw-hero__grade sw-hero__grade--edge" aria-hidden="true" />
      <div class="sw-hero__grade sw-hero__grade--base" aria-hidden="true" />
      <div class="sw-hero__grade sw-hero__grade--vignette" aria-hidden="true" />
    </div>

    <div ref="contentEl" class="sw-hero__content">
      <span ref="eyebrowEl" class="sw-eyebrow sw-hero__eyebrow">{{ locale.t('home.heroEyebrow') }}</span>
      <h1 ref="titleEl" class="sw-hero__title">SwissWatch Premium</h1>
      <p ref="subEl" class="sw-lede sw-hero__sub">{{ locale.t('home.heroSub') }}</p>
      <div ref="ctaEl" class="sw-hero__cta">
        <button class="sw-btn sw-btn--hero" type="button" @click="handleDiscover">
          {{ locale.t('home.discover') }} <span class="sw-btn__arrow" aria-hidden="true">&rarr;</span>
        </button>
      </div>
    </div>

    <div ref="scrollHintEl" class="sw-hero__scroll" aria-hidden="true">
      <span class="sw-hero__scroll-line" />
      <span class="sw-hero__scroll-label">{{ locale.t('home.scroll') }}</span>
    </div>
  </section>
</template>

<style scoped>
.sw-hero {
  position: relative;
  height: 100svh;
  min-height: 600px;
  display: flex;
  align-items: flex-end;
  color: var(--sw-white);
  overflow: hidden;
  background: var(--sw-obsidian);
}

.sw-hero__media {
  position: absolute;
  inset: 0;
}

.sw-hero__frame {
  position: absolute;
  /* Bleed past the edges so the parallax shift never exposes a seam. */
  inset: -12px;
  will-change: transform;
}

.sw-hero__frame :deep(.sw-smart-image),
.sw-hero__frame :deep(.sw-smart-image__img) {
  height: 100%;
}

/* A restrained photographic grade — more depth in the blacks, slightly held
   saturation — so the metal highlights stay bright and the image never turns
   into a flat dark rectangle. */
.sw-hero__frame :deep(.sw-smart-image__img) {
  filter: contrast(1.07) saturate(0.93) brightness(0.98);
}

.sw-hero__grade {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.sw-hero__grade--edge {
  background: linear-gradient(
    100deg,
    rgba(6, 6, 6, 0.74) 0%,
    rgba(6, 6, 6, 0.46) 26%,
    rgba(6, 6, 6, 0.12) 50%,
    rgba(6, 6, 6, 0) 68%
  );
}

.sw-hero__grade--base {
  background: linear-gradient(0deg, rgba(6, 6, 6, 0.72) 0%, rgba(6, 6, 6, 0.16) 34%, rgba(6, 6, 6, 0) 58%);
}

.sw-hero__grade--vignette {
  background: radial-gradient(118% 92% at 52% 44%, rgba(0, 0, 0, 0) 40%, rgba(0, 0, 0, 0.42) 100%);
}

.sw-hero__content {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: var(--container-max);
  margin-inline: auto;
  padding: 0 var(--container-pad) clamp(72px, 11vh, 132px);
  will-change: transform;
}

.sw-hero__eyebrow {
  display: block;
  color: rgba(253, 252, 250, 0.62);
  margin-bottom: clamp(20px, 3vh, 34px);
}

.sw-hero__title {
  font-family: var(--font-serif);
  font-weight: 400;
  /* Sized against both axes. On a 13vw-only scale the title wrapped to two
     lines that ate the full hero on any 16:10 laptop — the type covered the
     dial, which is the one thing the photograph is there to show. The vh term
     is what actually binds on a short viewport; the vw term still leads on a
     wide, tall one. */
  font-size: clamp(3rem, min(8.5vw, 14vh), 9rem);
  line-height: 0.86;
  letter-spacing: -0.035em;
  color: var(--sw-white);
  /* The serif's own sidebearing pushes the S off the grid; pull it back so the
     title optically aligns with the eyebrow above it. */
  margin-left: -0.045em;
}

.sw-hero__sub {
  margin-top: clamp(16px, 2.4vh, 28px);
  color: rgba(253, 252, 250, 0.74);
  max-width: 30ch;
}

.sw-hero__cta {
  margin-top: clamp(30px, 4.6vh, 54px);
}

.sw-hero__cta .sw-btn {
  color: var(--sw-white);
}

.sw-hero__scroll {
  position: absolute;
  right: var(--container-pad);
  bottom: clamp(72px, 11vh, 132px);
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.sw-hero__scroll-line {
  position: relative;
  width: 1px;
  height: 64px;
  background: rgba(253, 252, 250, 0.2);
  overflow: hidden;
}

.sw-hero__scroll-line::after {
  content: '';
  position: absolute;
  top: -100%;
  left: 0;
  width: 100%;
  height: 60%;
  background: linear-gradient(180deg, rgba(253, 252, 250, 0) 0%, rgba(253, 252, 250, 0.85) 100%);
  animation: sw-scroll-hint 3.4s cubic-bezier(0.33, 0, 0.12, 1) infinite;
}

.sw-hero__scroll-label {
  font-family: var(--font-sans);
  font-size: 0.5625rem;
  font-weight: 500;
  letter-spacing: 0.34em;
  text-transform: uppercase;
  color: rgba(253, 252, 250, 0.42);
}

@keyframes sw-scroll-hint {
  0% {
    top: -70%;
  }
  55% {
    top: 100%;
  }
  100% {
    top: 100%;
  }
}

@media (max-width: 900px) {
  .sw-hero {
    min-height: 560px;
  }

  /* On phones the composition re-weights: the type sits lower and tighter, the
     grade leans vertical (there is no room for a left-edge fall-off), and the
     scroll cue is dropped entirely. */
  .sw-hero__grade--edge {
    background: linear-gradient(180deg, rgba(6, 6, 6, 0.5) 0%, rgba(6, 6, 6, 0.06) 40%, rgba(6, 6, 6, 0) 60%);
  }

  .sw-hero__grade--base {
    background: linear-gradient(0deg, rgba(6, 6, 6, 0.86) 0%, rgba(6, 6, 6, 0.34) 40%, rgba(6, 6, 6, 0) 72%);
  }

  .sw-hero__title {
    font-size: clamp(3rem, 16vw, 5rem);
    letter-spacing: -0.03em;
  }

  .sw-hero__sub {
    font-size: 1.0625rem;
    max-width: 26ch;
  }

  .sw-hero__scroll {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .sw-hero__scroll-line::after {
    animation: none;
    top: 20%;
  }
}
</style>
