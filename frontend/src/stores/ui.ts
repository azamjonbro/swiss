import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useUiStore = defineStore('ui', () => {
  const isMenuOpen = ref(false);
  const isSearchOpen = ref(false);
  const isInquiryOpen = ref(false);
  const inquiryWatch = ref<{ id: string; name: string } | null>(null);
  const inquiryMessage = ref<string | null>(null);
  const isCartOpen = ref(false);
  const headerTheme = ref<'transparent' | 'dark' | 'light'>('transparent');

  function openMenu() {
    isSearchOpen.value = false;
    isMenuOpen.value = true;
  }
  function closeMenu() {
    isMenuOpen.value = false;
  }
  function toggleMenu() {
    isMenuOpen.value ? closeMenu() : openMenu();
  }

  function openSearch() {
    isMenuOpen.value = false;
    isSearchOpen.value = true;
    // iOS Safari raises the software keyboard only when focus() runs inside
    // the user's own tap. Vue's re-render is a microtask later, by which point
    // the gesture is spent and the field focuses silently with no keyboard —
    // so the panel stays mounted (SearchOverlay hides it with opacity, never
    // display) and the input is focused here, synchronously, instead.
    document.querySelector<HTMLInputElement>('.sw-search__input')?.focus();
  }
  function closeSearch() {
    isSearchOpen.value = false;
  }

  function openInquiry(watch?: { id: string; name: string }, message?: string) {
    inquiryWatch.value = watch ?? null;
    inquiryMessage.value = message ?? null;
    isCartOpen.value = false;
    isInquiryOpen.value = true;
  }
  function closeInquiry() {
    isInquiryOpen.value = false;
  }

  function openCart() {
    isMenuOpen.value = false;
    isSearchOpen.value = false;
    isCartOpen.value = true;
  }
  function closeCart() {
    isCartOpen.value = false;
  }
  function toggleCart() {
    isCartOpen.value ? closeCart() : openCart();
  }

  return {
    isMenuOpen,
    isSearchOpen,
    isInquiryOpen,
    inquiryWatch,
    inquiryMessage,
    isCartOpen,
    headerTheme,
    openMenu,
    closeMenu,
    toggleMenu,
    openSearch,
    closeSearch,
    openInquiry,
    closeInquiry,
    openCart,
    closeCart,
    toggleCart,
  };
});
