<script setup lang="ts">
interface Props {
  mode: 'light' | 'dark';
  size?: number;
}
withDefaults(defineProps<Props>(), { size: 14 });
</script>

<template>
  <svg
    v-if="mode === 'dark'"
    viewBox="0 0 24 24"
    :width="size"
    :height="size"
    fill="none"
    stroke="currentColor"
    stroke-width="1.5"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M20 14.3A8.4 8.4 0 1 1 9.7 4a6.7 6.7 0 0 0 10.3 10.3Z" />
  </svg>
  <svg v-else viewBox="0 0 24 24" :width="size" :height="size" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
    <circle cx="12" cy="12" r="4.1" />
    <path d="M12 2.75v2.25M12 19v2.25M4.75 12H2.5M21.5 12h-2.25M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M5.6 18.4l1.6-1.6M16.8 7.2l1.6-1.6" />
  </svg>
</template>
