import Lenis from 'lenis';
import { gsap, ScrollTrigger } from '@/animations/gsap';
import { prefersReducedMotion } from '@/composables/useReducedMotion';

let lenis: Lenis | null = null;
let rafHandler: ((time: number) => void) | null = null;
let onScrollTriggerRefresh: (() => void) | null = null;
let heightObserver: ResizeObserver | null = null;

export function initLenis(): Lenis | null {
  if (lenis) return lenis;
  if (prefersReducedMotion()) return null;

  lenis = new Lenis({
    duration: 1.15,
    easing: (t: number) => 1 - Math.pow(1 - t, 4),
    smoothWheel: true,
    touchMultiplier: 1.5,
  });

  lenis.on('scroll', ScrollTrigger.update);

  rafHandler = (time: number) => {
    lenis?.raf(time * 1000);
  };
  gsap.ticker.add(rafHandler);
  gsap.ticker.lagSmoothing(0);

  // Whenever ScrollTrigger recalculates trigger/pin positions (route change,
  // window resize, a pinned section mounting), Lenis's own scroll-limit
  // cache goes stale unless it's told to resize too. Without this, Lenis can
  // clamp scrolling to an outdated max, which reads as the page "freezing"
  // partway down.
  onScrollTriggerRefresh = () => lenis?.resize();
  ScrollTrigger.addEventListener('refresh', onScrollTriggerRefresh);
  ScrollTrigger.refresh();

  // ScrollTrigger.refresh() only fires for pins/route changes/window resize —
  // it never runs when a form's height changes on its own (a validation error
  // appearing, a floating label animating, an async list loading in). Without
  // this, Lenis keeps the scroll limit measured before that growth and clamps
  // a few dozen pixels short of the real bottom. <html> and <body> are both
  // pinned to height: 100%, so neither one's own box actually resizes when
  // content overflows them — #app (the Vue mount point, height: auto) is the
  // element that genuinely grows, so that's what has to be observed.
  const growthRoot = document.getElementById('app') ?? document.body;
  heightObserver = new ResizeObserver(() => lenis?.resize());
  heightObserver.observe(growthRoot);

  return lenis;
}

export function getLenis(): Lenis | null {
  return lenis;
}

export function destroyLenis(): void {
  if (rafHandler) {
    gsap.ticker.remove(rafHandler);
    rafHandler = null;
  }
  if (onScrollTriggerRefresh) {
    ScrollTrigger.removeEventListener('refresh', onScrollTriggerRefresh);
    onScrollTriggerRefresh = null;
  }
  heightObserver?.disconnect();
  heightObserver = null;
  releaseScrollHold();
  lenis?.destroy();
  lenis = null;
}

export function scrollTo(target: string | number | HTMLElement, options?: Record<string, unknown>): void {
  // An anchor jump asked for by the page outranks a post-navigation hold.
  releaseScrollHold();
  if (lenis) {
    lenis.scrollTo(target, { duration: 1.4, easing: (t: number) => 1 - Math.pow(1 - t, 4), ...options });
  } else if (typeof target === 'number') {
    // Reduced motion: Lenis is never created, so the native scroller is all
    // there is. Without this branch a numeric target was silently dropped.
    window.scrollTo({ top: target, behavior: 'smooth' });
  } else if (typeof target === 'string') {
    document.querySelector(target)?.scrollIntoView({ behavior: 'smooth' });
  } else {
    target.scrollIntoView({ behavior: 'smooth' });
  }
}

/**
 * How long a fresh page keeps itself pinned to the top (see `resetScroll`).
 * Long enough to outlast the browser's own restoration, short enough that a
 * reader who reaches for the wheel never races it.
 */
const SCROLL_HOLD_MS = 600;

let holdDeadline = 0;
let holdListenersBound = false;

function releaseScrollHold(): void {
  holdDeadline = 0;
}

/**
 * The hold listens on `scroll` rather than on a frame loop: the offset the
 * browser restores arrives as a scroll event, and scroll events keep firing in
 * a backgrounded tab where requestAnimationFrame does not.
 */
function onHeldScroll(): void {
  if (performance.now() >= holdDeadline) return;
  if (window.scrollY !== 0) scrollToTopNow();
}

/** Any real input from the reader ends the hold on the spot. */
function bindHoldListeners(): void {
  if (holdListenersBound) return;
  holdListenersBound = true;
  window.addEventListener('scroll', onHeldScroll, { passive: true });
  window.addEventListener('wheel', releaseScrollHold, { passive: true });
  window.addEventListener('touchstart', releaseScrollHold, { passive: true });
  window.addEventListener('keydown', releaseScrollHold);
  window.addEventListener('pointerdown', releaseScrollHold);
}

function scrollToTopNow(): void {
  // `force`, because Lenis ignores every programmatic scroll while it is
  // stopped — and a link tapped inside the open menu or the cart drawer
  // navigates from exactly that state, where the reset was being dropped.
  lenis?.scrollTo(0, { immediate: true, force: true });
  // Native as well: Lenis may not exist at all (reduced motion), and its own
  // scrollTo returns early when its internal target already reads 0 while the
  // document itself sits further down.
  window.scrollTo(0, 0);
  // The incoming page is a different height, and a stale scroll limit would
  // clamp the next scroll partway down the document.
  lenis?.resize();
}

/**
 * Puts the document back at the very top — what a route change owes the reader.
 *
 * Setting the offset once is not enough. On a Back or a Forward the browser
 * re-applies the offset it had saved for that history entry, and it does so
 * after the entry's page has laid out — which is after this reset, not before
 * it. (`history.scrollRestoration` is set to 'manual' on every entry in the
 * router, and even that only covers part of it.) So the top is held for a few
 * hundred milliseconds, and released the moment the reader touches the wheel,
 * the screen or the keyboard.
 */
export function resetScroll(): void {
  scrollToTopNow();
  bindHoldListeners();
  holdDeadline = performance.now() + SCROLL_HOLD_MS;
  // A scroll event is the normal way the restored offset announces itself, but
  // a tab that is not being painted does not dispatch one — the offset lands
  // all the same, and the reader finds it there when they come back to the tab.
  // Two timers cover that case; they cost nothing when the page is already up.
  window.setTimeout(onHeldScroll, 80);
  window.setTimeout(onHeldScroll, 320);
}
