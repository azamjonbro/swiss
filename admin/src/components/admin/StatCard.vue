<script setup lang="ts">
interface Props {
  label: string;
  value: number | string;
}

defineProps<Props>();
</script>

<template>
  <div class="sw-admin-card sw-stat-card">
    <span class="sw-stat-card__label">{{ label }}</span>
    <span class="sw-stat-card__value">{{ value }}</span>
  </div>
</template>

<style scoped>
.sw-stat-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sw-stat-card__label {
  font-size: 0.78rem;
  color: var(--admin-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.sw-stat-card__value {
  font-family: var(--font-sans);
  font-weight: 700;
  font-size: 2.25rem;
  letter-spacing: -0.02em;
}
</style>
