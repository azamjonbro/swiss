<script setup lang="ts">
import { computed } from 'vue';

/**
 * One stroked 24×24 icon set for the whole admin. Every glyph is drawn on the
 * same grid with the same stroke weight so rows of them line up optically.
 */
const PATHS: Record<string, string> = {
  dashboard: 'M4 13h6V4H4v9Zm0 7h6v-5H4v5Zm10 0h6v-9h-6v9Zm0-16v5h6V4h-6Z',
  watch: 'M12 8.5V12l2 1.5M8.5 4.6 9 2h6l.5 2.6M8.5 19.4 9 22h6l.5-2.6M12 19.5a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15Z',
  category: 'M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5v-11ZM4 10h16M10 10v10',
  brand: 'm12 3 2.6 5.4 5.9.8-4.3 4.2 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.2l5.9-.8L12 3Z',
  collection: 'M7 7V5.5A1.5 1.5 0 0 1 8.5 4h11A1.5 1.5 0 0 1 21 5.5v11a1.5 1.5 0 0 1-1.5 1.5H18M3 8.5A1.5 1.5 0 0 1 4.5 7h11A1.5 1.5 0 0 1 17 8.5v11a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 3 19.5v-11Z',
  inquiry: 'M4 6.5A1.5 1.5 0 0 1 5.5 5h13A1.5 1.5 0 0 1 20 6.5v11a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5v-11Zm.4-.6 7.6 6.6 7.6-6.6',
  media: 'M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5v-11Zm.5 11.8 5-5.3 3.2 3.2 3-2.8 3.8 3.6M9.5 10a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z',
  settings:
    'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-2.6a7.6 7.6 0 0 0 0-.8l1.8-1.4-1.8-3.1-2.1.8a7.6 7.6 0 0 0-1.4-.8L15.6 5h-3.6l-.3 2.1a7.6 7.6 0 0 0-1.4.8l-2.1-.8-1.8 3.1 1.8 1.4a7.6 7.6 0 0 0 0 1.6l-1.8 1.4 1.8 3.1 2.1-.8a7.6 7.6 0 0 0 1.4.8l.3 2.3h3.6l.3-2.3a7.6 7.6 0 0 0 1.4-.8l2.1.8 1.8-3.1-1.8-1.4c.02-.26.03-.53.03-.8Z',
  // A rising trend line over an axis — the page it names is a visitor chart.
  analytics: 'M4 4v15.5A.5.5 0 0 0 4.5 20H20M7.5 15.5l3.5-4 3 2.5 4.5-6',
  // Two figures, one behind the other — a list of people, not one person.
  customers: 'M15.5 20v-1.7a3.3 3.3 0 0 0-3.3-3.3H6.8a3.3 3.3 0 0 0-3.3 3.3V20M9.5 11.5a3.7 3.7 0 1 0 0-7.5 3.7 3.7 0 0 0 0 7.5ZM20.5 20v-1.7a3.3 3.3 0 0 0-2.5-3.2M15.5 4.3a3.3 3.3 0 0 1 0 6.4',
  plus: 'M12 5v14M5 12h14',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm5.2-1.8L21 21',
  edit: 'M4 20h4L20 8a2.1 2.1 0 0 0-3-3L5 17v3Zm11.5-13 3 3',
  trash: 'M4.5 6.5h15M9.5 6.5V5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v1.5M6.5 6.5 7.3 19a1.5 1.5 0 0 0 1.5 1.4h6.4a1.5 1.5 0 0 0 1.5-1.4l.8-12.5M10.5 10v6.5M13.5 10v6.5',
  close: 'M6 6l12 12M18 6 6 18',
  check: 'm5 12.5 4.5 4.5L19 7',
  chevronDown: 'm6 9.5 6 6 6-6',
  chevronLeft: 'm14.5 6-6 6 6 6',
  arrowUp: 'M12 19V5m0 0-6 6m6-6 6 6',
  arrowDown: 'M12 5v14m0 0 6-6m-6 6-6-6',
  upload: 'M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M4 15v3.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V15',
  external: 'M14 4h6v6M20 4l-9 9M18 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10',
  logout: 'M15 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2v-2M10 12h11m0 0-3.5-3.5M21 12l-3.5 3.5',
  menu: 'M4 7h16M4 12h16M4 17h16',
  copy: 'M9 9V5.5A1.5 1.5 0 0 1 10.5 4h8A1.5 1.5 0 0 1 20 5.5v8a1.5 1.5 0 0 1-1.5 1.5H15M5.5 9h8A1.5 1.5 0 0 1 15 10.5v8a1.5 1.5 0 0 1-1.5 1.5h-8A1.5 1.5 0 0 1 4 18.5v-8A1.5 1.5 0 0 1 5.5 9Z',
  star: 'm12 4 2.4 5 5.6.8-4 3.9.9 5.5-4.9-2.6-4.9 2.6.9-5.5-4-3.9 5.6-.8L12 4Z',
  eye: 'M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Zm9.5 2.6a2.6 2.6 0 1 0 0-5.2 2.6 2.6 0 0 0 0 5.2Z',
  eyeOff: 'M4 4l16 16M9.9 5.8A8.6 8.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-3 3.9M6.4 8.1A17 17 0 0 0 2.5 12S6 18.5 12 18.5c1 0 1.9-.2 2.7-.5M10.2 10.2a2.6 2.6 0 0 0 3.6 3.6',
  alert: 'M12 8.5v4.5m0 3h.01M10.3 4.2 2.6 17.5A2 2 0 0 0 4.3 20.5h15.4a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0Z',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-9.5V16m0-8h.01',
  globe: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0 0c2.2-2.3 3.3-5.3 3.3-9S14.2 5.3 12 3m0 18c-2.2-2.3-3.3-5.3-3.3-9S9.8 5.3 12 3M3.4 9h17.2M3.4 15h17.2',
  grip: 'M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01',
  image: 'M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5v-11Zm.5 11.8 5-5.3 3.2 3.2 3-2.8 3.8 3.6M9.5 10a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z',
  video: 'M4 8a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8Zm11 3 5-3v8l-5-3',
};

const props = withDefaults(defineProps<{ name: keyof typeof PATHS | string; size?: number }>(), { size: 16 });

const d = computed(() => PATHS[props.name] ?? PATHS.info);
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.6"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path :d="d" />
  </svg>
</template>
