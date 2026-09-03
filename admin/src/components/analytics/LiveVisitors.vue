<script setup lang="ts">
import { computed } from 'vue';
import { useLocaleStore } from '@/stores/locale';
import AdminIcon from '@/components/shared/AdminIcon.vue';
import type { AnalyticsLive } from '@/types/analytics';

/**
 * Who is on the site right now.
 *
 * "Right now" is DataFast's definition, not ours: it counts a visitor active
 * for ten minutes after their last pageview, and that window is fixed on
 * their side. The panel says so in its subtitle rather than implying a
 * live-to-the-second reading it cannot deliver.
 */
const props = defineProps<{ data: AnalyticsLive | null; isLoading: boolean; hasError: boolean }>();

const locale = useLocaleStore();

const visitors = computed(() => props.data?.visitors ?? []);
const count = computed(() => props.data?.count ?? 0);

/** Strips the origin — the path is what identifies the page being read. */
function pathOf(url: string | null): string {
  if (!url) return '—';
  try {
    const parsed = new URL(url);
    return `${parsed.pathname}${parsed.search}` || '/';
  } catch {
    return url;
  }
}

function placeOf(city: string | null, country: string | null): string {
  return [city, country].filter(Boolean).join(', ') || '—';
}

function systemOf(device: string | null, browser: string | null, os: string | null): string {
  return [device, browser, os].filter(Boolean).join(' · ') || '—';
}

/**
 * How long ago the visitor was last seen.
 *
 * DataFast's realtime map reports when the session started; `lastSeenAt` only
 * arrives from the visitors endpoint. Whichever is present is labelled for
 * what it is, so "3m" never silently changes meaning between rows.
 */
function sinceOf(visitor: { lastSeenAt: string | null; sessionStartedAt: string | null }): string {
  const stamp = visitor.lastSeenAt ?? visitor.sessionStartedAt;
  if (!stamp) return '—';
  const ms = Date.now() - new Date(stamp).getTime();
  if (Number.isNaN(ms) || ms < 0) return '—';
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return locale.t('admin.analyticsJustNow');
  return `${minutes}m`;
}

function sinceLabel(visitor: { lastSeenAt: string | null }): string {
  return visitor.lastSeenAt ? locale.t('admin.analyticsLastSeen') : locale.t('admin.analyticsSessionStart');
}
</script>

<template>
  <section class="sw-admin-card sw-live">
    <header class="sw-live__head">
      <div>
        <h2 class="sw-live__title">
          <span class="sw-live__dot" :class="{ 'is-idle': !count }" aria-hidden="true" />
          {{ locale.t('admin.analyticsLiveVisitors') }}
        </h2>
        <p class="sw-live__sub">
          {{ locale.t('admin.analyticsLiveWindow') }} {{ data?.windowMinutes ?? 10 }} {{ locale.t('admin.analyticsMinutes') }}
        </p>
      </div>
      <span class="sw-live__count">{{ count.toLocaleString() }}</span>
    </header>

    <div v-if="isLoading && !data" class="sw-live__skeletons">
      <div v-for="n in 3" :key="n" class="sw-admin-skeleton sw-live__skeleton" />
    </div>

    <p v-else-if="hasError" class="sw-live__empty">
      <AdminIcon name="alert" :size="15" />
      {{ locale.t('admin.analyticsLiveFailed') }}
    </p>

    <p v-else-if="!visitors.length" class="sw-live__empty">
      {{ count ? locale.t('admin.analyticsLiveNoDetail') : locale.t('admin.analyticsLiveNobody') }}
    </p>

    <div v-else class="sw-admin-table-wrap">
      <table class="sw-admin-table">
        <thead>
          <tr>
            <th>{{ locale.t('admin.analyticsLocation') }}</th>
            <th>{{ locale.t('admin.analyticsSystem') }}</th>
            <th>{{ locale.t('admin.analyticsPage') }}</th>
            <th>{{ locale.t('admin.analyticsActivity') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(visitor, index) in visitors" :key="visitor.id ?? index">
            <td>{{ placeOf(visitor.city, visitor.country) }}</td>
            <td class="sw-live__muted">{{ systemOf(visitor.device, visitor.browser, visitor.os) }}</td>
            <td class="sw-live__path" :title="visitor.url ?? ''">{{ pathOf(visitor.url) }}</td>
            <td class="sw-live__since" :title="sinceLabel(visitor)">{{ sinceOf(visitor) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped>
.sw-live {
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sw-live__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.sw-live__title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 0.75rem;
  font-weight: 650;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--admin-text-muted);
}

.sw-live__dot {
  width: 7px;
  height: 7px;
  border-radius: var(--radius-full);
  background: var(--admin-success);
  box-shadow: 0 0 0 3px var(--admin-success-soft);
}

.sw-live__dot.is-idle {
  background: var(--admin-text-subtle);
  box-shadow: none;
}

@media (prefers-reduced-motion: no-preference) {
  .sw-live__dot:not(.is-idle) {
    animation: sw-live-pulse 2.4s ease-in-out infinite;
  }
}

@keyframes sw-live-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.45; }
}

.sw-live__sub {
  margin: 3px 0 0;
  font-size: 0.72rem;
  color: var(--admin-text-subtle);
}

.sw-live__count {
  font-size: 1.85rem;
  font-weight: 680;
  line-height: 1;
  letter-spacing: -0.03em;
  font-variant-numeric: tabular-nums;
}

.sw-live__skeletons {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.sw-live__skeleton {
  height: 34px;
}

.sw-live__empty {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  padding: 14px 0 4px;
  font-size: 0.82rem;
  color: var(--admin-text-subtle);
}

.sw-live__muted {
  color: var(--admin-text-muted);
}

.sw-live__path {
  max-width: 260px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sw-live__since {
  font-variant-numeric: tabular-nums;
  color: var(--admin-text-muted);
  white-space: nowrap;
}
</style>
