<script setup lang="ts">
import AdminIcon from '@/components/shared/AdminIcon.vue';

withDefaults(defineProps<{ icon?: string; title: string; body?: string }>(), { icon: 'info' });
</script>

<template>
  <div class="sw-admin-empty">
    <span class="sw-admin-empty__icon"><AdminIcon :name="icon" :size="20" /></span>
    <p class="sw-admin-empty__title">{{ title }}</p>
    <p v-if="body" class="sw-admin-empty__body">{{ body }}</p>
    <slot />
  </div>
</template>
