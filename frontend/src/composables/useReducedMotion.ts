import { ref, onMounted, onUnmounted } from 'vue';

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function useReducedMotion() {
  const reduced = ref(prefersReducedMotion());

  let mql: MediaQueryList | null = null;
  const handler = (e: MediaQueryListEvent) => {
    reduced.value = e.matches;
  };

  onMounted(() => {
    mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    mql.addEventListener('change', handler);
  });

  onUnmounted(() => {
    mql?.removeEventListener('change', handler);
  });

  return reduced;
}
