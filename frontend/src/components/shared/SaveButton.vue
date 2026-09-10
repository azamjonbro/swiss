<script setup lang="ts">
import { computed, ref } from 'vue';
import { useLocaleStore } from '@/stores/locale';
import { useSavedStore } from '@/stores/saved';

interface Props {
  watchId: string;
  /**
   * `icon` is the bare heart pinned to a card's photograph; `label` sets it
   * beside the word, for the product page's row of secondary actions.
   */
  variant?: 'icon' | 'label';
}

const props = withDefaults(defineProps<Props>(), { variant: 'icon' });

const locale = useLocaleStore();
const saved = useSavedStore();

const isSaved = computed(() => saved.has(props.watchId));

/** What the click will do — the accessible name, on both variants. */
const action = computed(() => locale.t(isSaved.value ? 'saved.remove' : 'saved.add'));

/**
 * What the button says out loud, when it says anything. The short state word,
 * not the long action: beside a photograph "Saved" reads as the piece's
 * standing, which is what the visitor is actually looking for.
 */
const text = computed(() => locale.t(isSaved.value ? 'watchDetail.saved' : 'watchDetail.save'));

/**
 * The heart beats once on the way in, never on the way out — a removal that
 * celebrates itself reads as a mistake being confirmed.
 */
const isBeating = ref(false);

function onClick(event: MouseEvent) {
  // On a card the heart sits inside the RouterLink that wraps the whole tile;
  // without this, saving a piece navigates to it.
  event.preventDefault();
  event.stopPropagation();

  if (!isSaved.value) {
    isBeating.value = true;
    window.setTimeout(() => (isBeating.value = false), 420);
  }

  void saved.toggle(props.watchId);
}
</script>

<template>
  <button
    class="sw-save"
    :class="[`is-${variant}`, { 'is-saved': isSaved, 'is-beating': isBeating }]"
    type="button"
    :aria-pressed="isSaved"
    :aria-label="action"
    :title="action"
    @click="onClick"
  >
    <svg
      class="sw-save__heart"
      viewBox="0 0 24 24"
      :fill="isSaved ? 'currentColor' : 'none'"
      stroke="currentColor"
      stroke-width="1.4"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path
        d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78Z"
      />
    </svg>
    <span v-if="variant === 'label'" class="sw-save__label">{{ text }}</span>
  </button>
</template>

<style scoped>
.sw-save {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: var(--text);
  -webkit-tap-highlight-color: transparent;
  transition:
    color var(--dur-fast) var(--ease-out),
    background var(--dur-fast) var(--ease-out),
    border-color var(--dur-fast) var(--ease-out);
}

.sw-save__heart {
  width: 20px;
  height: 20px;
  flex: none;
  transition: transform 0.42s var(--ease-editorial);
}

.sw-save.is-saved {
  color: var(--sw-crimson);
}

.sw-save:hover:not(.is-saved) {
  color: var(--accent);
}

/* One beat: the heart swells and settles. Deliberately not a loop — the state
   is already carried by the fill. */
.sw-save.is-beating .sw-save__heart {
  animation: sw-save-beat 0.42s var(--ease-editorial);
}

@keyframes sw-save-beat {
  0% {
    transform: scale(1);
  }

  38% {
    transform: scale(1.32);
  }

  70% {
    transform: scale(0.94);
  }

  100% {
    transform: scale(1);
  }
}

/* --- The card's heart: a disc over the photograph ---------------------- */
.sw-save.is-icon {
  /* 40px of touch target around a 20px mark; the disc is what the eye reads,
     the padding is what the thumb hits. */
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid transparent;
  background: var(--bg-veil);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  /* Quiet until wanted: on a grid of cards a row of solid hearts competes with
     the watches. It comes up on hover, on focus, and whenever it is filled. */
  opacity: 0.55;
  transition:
    opacity var(--dur-fast) var(--ease-out),
    color var(--dur-fast) var(--ease-out);
}

.sw-save.is-icon:hover,
.sw-save.is-icon:focus-visible,
.sw-save.is-icon.is-saved {
  opacity: 1;
}

/* A touch device has no hover to reveal it, so it stays legible there. */
@media (hover: none) {
  .sw-save.is-icon {
    opacity: 0.8;
  }
}

/* --- The product page's heart: set beside its word --------------------- */
.sw-save.is-label {
  font-family: var(--font-sans);
  font-size: 0.75rem;
  font-weight: 500;
  letter-spacing: 0.2em;
  text-transform: uppercase;
}

.sw-save.is-label .sw-save__heart {
  width: 17px;
  height: 17px;
}

@media (prefers-reduced-motion: reduce) {
  .sw-save.is-beating .sw-save__heart {
    animation: none;
  }
}
</style>
