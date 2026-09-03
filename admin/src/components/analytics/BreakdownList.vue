<script setup lang="ts">
import { computed } from 'vue';
import { useLocaleStore } from '@/stores/locale';
import type { Slice } from '@/types/analytics';

/**
 * A ranked list with a proportional bar behind each row.
 *
 * Used for every breakdown on the page — traffic channels, referrers,
 * countries, cities, devices, browsers, operating systems, top pages — so the
 * seven panels read as one object rather than seven different treatments of
 * the same shape.
 *
 * The bar is a background fill on the row rather than a separate element, so
 * the label sits on top of it and nothing has to reserve a second column.
 */
const props = withDefaults(
  defineProps<{
    title: string;
    rows: Slice[];
    /** How many rows to show before "+N more". */
    limit?: number;
    /** Rendered instead of the list when the section failed upstream. */
    unavailable?: boolean;
    /** Small print under the title — e.g. that a grouping is derived. */
    note?: string;
  }>(),
  { limit: 8, unavailable: false, note: '' },
);

const locale = useLocaleStore();

const visible = computed(() => props.rows.slice(0, props.limit));
const overflow = computed(() => Math.max(props.rows.length - props.limit, 0));

/** Bars are scaled against the largest row, not the total — a share of 3% is
    still readable when the leader holds 80%. */
const peak = computed(() => Math.max(...props.rows.map((r) => r.visitors), 1));
const total = computed(() => props.rows.reduce((sum, r) => sum + r.visitors, 0));

function share(value: number): string {
  if (!total.value) return '0%';
  return `${Math.round((value / total.value) * 100)}%`;
}

function width(value: number): string {
  return `${Math.max((value / peak.value) * 100, 1.5)}%`;
}
</script>

<template>
  <section class="sw-admin-card sw-bd">
    <header class="sw-bd__head">
      <h2 class="sw-bd__title">{{ title }}</h2>
      <p v-if="note" class="sw-bd__note">{{ note }}</p>
    </header>

    <p v-if="unavailable" class="sw-bd__empty">{{ locale.t('admin.analyticsSectionFailed') }}</p>
    <p v-else-if="!rows.length" class="sw-bd__empty">{{ locale.t('admin.analyticsNoData') }}</p>

    <ol v-else class="sw-bd__list">
      <li v-for="row in visible" :key="row.label" class="sw-bd__row">
        <span class="sw-bd__bar" :style="{ width: width(row.visitors) }" aria-hidden="true" />
        <span class="sw-bd__label" :title="row.label">{{ row.label }}</span>
        <span class="sw-bd__share">{{ share(row.visitors) }}</span>
        <span class="sw-bd__value">{{ row.visitors.toLocaleString() }}</span>
      </li>
    </ol>

    <p v-if="overflow" class="sw-bd__more">+{{ overflow }} {{ locale.t('admin.analyticsMoreRows') }}</p>
  </section>
</template>

<style scoped>
.sw-bd {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 18px;
}

.sw-bd__head {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.sw-bd__title {
  margin: 0;
  font-size: 0.75rem;
  font-weight: 650;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--admin-text-muted);
}

.sw-bd__note {
  margin: 0;
  font-size: 0.72rem;
  color: var(--admin-text-subtle);
}

.sw-bd__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sw-bd__row {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 10px;
  padding: 7px 9px;
  border-radius: var(--radius-sm);
  font-size: 0.85rem;
}

.sw-bd__bar {
  position: absolute;
  inset: 0 auto 0 0;
  border-radius: var(--radius-sm);
  background: var(--admin-accent-soft);
}

.sw-bd__label,
.sw-bd__share,
.sw-bd__value {
  position: relative;
}

.sw-bd__label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sw-bd__share {
  font-size: 0.75rem;
  color: var(--admin-text-subtle);
  font-variant-numeric: tabular-nums;
}

.sw-bd__value {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.sw-bd__empty,
.sw-bd__more {
  margin: 0;
  font-size: 0.8rem;
  color: var(--admin-text-subtle);
}

.sw-bd__empty {
  padding: 10px 0 4px;
}
</style>
