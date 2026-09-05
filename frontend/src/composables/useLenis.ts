import Lenis from 'lenis';
import { gsap, ScrollTrigger } from '@/animations/gsap';
import { prefersReducedMotion } from '@/composables/useReducedMotion';

let lenis: Lenis | null = null;
let rafHandler: ((time: number) => void) | null = null;
let onScrollTriggerRefresh: (() => void) | null = null;
let heightObserver: ResizeObserver | null = null;

/**
 * Lenis smooths the wheel, and nothing else: `syncTouch` is left at its default
 * `false`, and on that setting Lenis bails out of every touch event and hands
 * the gesture straight back to the browser (`isScrolling = 'native'`). So on a
 * phone it smooths nothing — it just runs a rAF loop every frame and re-enters
 * ScrollTrigger on every native scroll event, which is exactly the budget the
 * scroll itself needs. Touch-only devices are better off without it, and every
 * caller here already copes with a null instance (that is the reduced-motion
 * path). Coarse-pointer *and* no hover, so a touchscreen laptop keeps smoothing.
 */
function isTouchOnly(): boolean {
  return window.matchMedia('(hover: none) and (pointer: coarse)').matches;
}

export function initLenis(): Lenis | null {
  if (lenis) return lenis;
  if (prefersReducedMotion()) return null;
  if (isTouchOnly()) {
    // ScrollTrigger still needs its one post-mount measurement; on the smooth
    // path the refresh below does it.
    ScrollTrigger.refresh();
    return null;
  }

  // Short enough that the page keeps up with the wheel. At 1.15s with a
  // quartic ease the tail crawled for the better part of a second after the
  // gesture had stopped, which reads as lag rather than smoothing; 0.75s on a
  // cubic ease still glides but lands where the reader expects it to.
  lenis = new Lenis({
    duration: 0.75,
    easing: (t: number) => 1 - Math.pow(1 - t, 3),
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
    lenis.scrollTo(target, { duration: 0.95, easing: (t: number) => 1 - Math.pow(1 - t, 3), ...options });
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

let holdArmed = false;
let holdDeadline = 0;
let holdListenersBound = false;
/** See `onVisibilityChange` — a hold gets one extension, never a stream. */
let holdExtended = false;

function releaseScrollHold(): void {
  holdArmed = false;
  holdDeadline = 0;
  holdExtended = false;
}

function isHolding(): boolean {
  if (!holdArmed) return false;
  // A tab nobody is looking at cannot be scrolled by the reader — and it is
  // exactly where a restored offset lands late, because the frames that would
  // have carried it never ran. Hold until the tab is on screen again.
  if (document.hidden) return true;
  if (performance.now() < holdDeadline) return true;
  holdArmed = false;
  return false;
}

/**
 * The hold works off events rather than a frame loop: the offset the browser
 * restores announces itself as a scroll, and a backgrounded tab that never
 * paints a frame still runs timers.
 */
function onHeldScroll(): void {
  if (!isHolding()) return;
  if (window.scrollY !== 0) scrollToTopNow();
}

/**
 * The countdown is meant to run while the page is being read, not before — so
 * returning to the foreground restarts it. Once, though, not every time.
 *
 * `holdArmed` is only ever cleared lazily, by an `isHolding()` that happens to
 * run past the deadline. A reader who opens a page and neither scrolls nor
 * taps fires nothing that would call it, so the hold stays armed for the rest
 * of the session — and re-arming the deadline unconditionally here handed
 * every later app switch a fresh 600ms window in which any scroll that wasn't
 * preceded by a touch (an offset the browser restores, a fling still carrying
 * momentum from before the page was backgrounded) was yanked back to the top.
 * On a phone, where switching away and back is constant, that reads as the
 * home page throwing itself to the top at random.
 *
 * One extension still covers the case this exists for: a tab that was hidden
 * when its restored offset landed. A second one never does.
 */
function onVisibilityChange(): void {
  if (!holdArmed || document.hidden) return;
  if (!holdExtended) {
    holdExtended = true;
    holdDeadline = performance.now() + SCROLL_HOLD_MS;
  }
  onHeldScroll();
}

/** Any real input from the reader ends the hold on the spot. */
function bindHoldListeners(): void {
  if (holdListenersBound) return;
  holdListenersBound = true;
  window.addEventListener('scroll', onHeldScroll, { passive: true });
  document.addEventListener('visibilitychange', onVisibilityChange);
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
  holdArmed = true;
  holdDeadline = performance.now() + SCROLL_HOLD_MS;
  holdExtended = false;
  // A scroll event is the normal way the restored offset announces itself; the
  // timers are the belt to that brace, and the one thing that still runs in a
  // tab which is not painting frames.
  window.setTimeout(onHeldScroll, 80);
  window.setTimeout(onHeldScroll, 320);
}
