import { watch, type Ref } from 'vue';
import { getLenis } from '@/composables/useLenis';

export function useLockBodyScroll(isLocked: Ref<boolean>) {
  watch(
    isLocked,
    (locked) => {
      const lenis = getLenis();
      if (locked) {
        document.documentElement.classList.add('sw-scroll-locked');
        lenis?.stop();
      } else {
        document.documentElement.classList.remove('sw-scroll-locked');
        lenis?.start();
      }
    },
    { immediate: true },
  );
}
