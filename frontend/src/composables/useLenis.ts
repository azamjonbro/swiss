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
  lenis?.destroy();
  lenis = null;
}

export function scrollTo(target: string | number | HTMLElement, options?: Record<string, unknown>): void {
  if (lenis) {
    lenis.scrollTo(target, { duration: 1.4, easing: (t: number) => 1 - Math.pow(1 - t, 4), ...options });
  } else if (typeof target === 'string') {
    document.querySelector(target)?.scrollIntoView({ behavior: 'smooth' });
  }
}
