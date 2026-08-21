import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useUiStore = defineStore('ui', () => {
  const isMenuOpen = ref(false);
  const isSearchOpen = ref(false);
  const isInquiryOpen = ref(false);
  const inquiryWatch = ref<{ id: string; name: string } | null>(null);
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
  }
  function closeSearch() {
    isSearchOpen.value = false;
  }

  function openInquiry(watch?: { id: string; name: string }) {
    inquiryWatch.value = watch ?? null;
    isInquiryOpen.value = true;
  }
  function closeInquiry() {
    isInquiryOpen.value = false;
  }

  return {
    isMenuOpen,
    isSearchOpen,
    isInquiryOpen,
    inquiryWatch,
    headerTheme,
    openMenu,
    closeMenu,
    toggleMenu,
    openSearch,
    closeSearch,
    openInquiry,
    closeInquiry,
  };
});
