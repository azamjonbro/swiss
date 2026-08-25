import type { App, DirectiveBinding } from 'vue';
import { prefersReducedMotion } from '@/composables/useReducedMotion';

interface RevealOptions {
  /** Stagger, in seconds, applied as a CSS transition-delay. */
  delay?: number;
  /** Vertical travel in px (default 22). */
  y?: number;
  /** Clip-wipe variant, for editorial photography. */
  clip?: boolean;
}

const REVEALED = 'is-revealed';

let observer: IntersectionObserver | null = null;
/** Everything still waiting to be revealed, for the jump-scroll sweep below. */
const pending = new Set<HTMLElement>();
let lastScrollY = 0;
let sweepQueued = false;
let sweepListening = false;

function show(el: HTMLElement) {
  el.classList.add(REVEALED);
  pending.delete(el);
  observer?.unobserve(el);
  if (!pending.size) stopSweep();
}

/**
 * IntersectionObserver only fires when a threshold is crossed. A jump — reload
 * with a restored scroll offset, a back navigation, an anchor jump — can move
 * an element from below the fold to above it without ever producing a callback,
 * which would leave it invisible forever. After any jump larger than a
 * viewport, reveal outright whatever the reader has already scrolled past.
 */
function sweep() {
  sweepQueued = false;
  for (const el of [...pending]) {
    if (el.getBoundingClientRect().bottom <= 0) show(el);
  }
}

function onScroll() {
  const y = window.scrollY;
  const jumped = Math.abs(y - lastScrollY) > window.innerHeight;
  lastScrollY = y;
  if (!jumped || sweepQueued) return;
  sweepQueued = true;
  requestAnimationFrame(sweep);
}

function startSweep() {
  if (sweepListening) return;
  sweepListening = true;
  lastScrollY = window.scrollY;
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('pageshow', sweep);
}

function stopSweep() {
  if (!sweepListening) return;
  sweepListening = false;
  window.removeEventListener('scroll', onScroll);
  window.removeEventListener('pageshow', sweep);
}

function getObserver(): IntersectionObserver {
  if (observer) return observer;
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        // Reveals are one-shot: nothing re-hides on scroll-up, which keeps the
        // page calm and lets us stop observing immediately.
        show(entry.target as HTMLElement);
      }
    },
    { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
  );
  return observer;
}

function parse(binding: DirectiveBinding<RevealOptions | number | undefined>): RevealOptions {
  if (typeof binding.value === 'number') return { delay: binding.value };
  return binding.value ?? {};
}

export const reveal = {
  mounted(el: HTMLElement, binding: DirectiveBinding<RevealOptions | number | undefined>) {
    const opts = parse(binding);

    if (prefersReducedMotion()) {
      el.classList.add(REVEALED);
      return;
    }

    el.classList.add(opts.clip || binding.modifiers.clip ? 'sw-reveal--clip' : 'sw-reveal');
    if (opts.delay) el.style.setProperty('--reveal-delay', `${opts.delay}s`);
    if (opts.y !== undefined) el.style.setProperty('--reveal-y', `${opts.y}px`);

    pending.add(el);
    startSweep();
    getObserver().observe(el);
  },
  unmounted(el: HTMLElement) {
    pending.delete(el);
    observer?.unobserve(el);
    if (!pending.size) stopSweep();
  },
};

export default {
  install(app: App) {
    app.directive('reveal', reveal);
  },
};
