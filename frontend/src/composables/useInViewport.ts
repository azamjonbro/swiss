import { ref, onMounted, onUnmounted, type Ref } from 'vue';

export function useInViewport(target: Ref<Element | null>, options: IntersectionObserverInit = {}) {
  const isVisible = ref(false);
  let observer: IntersectionObserver | null = null;

  onMounted(() => {
    if (!target.value) return;
    observer = new IntersectionObserver(
      ([entry]) => {
        isVisible.value = entry.isIntersecting;
      },
      { threshold: 0.25, rootMargin: '100px 0px', ...options },
    );
    observer.observe(target.value);
  });

  onUnmounted(() => {
    observer?.disconnect();
  });

  return { isVisible };
}
