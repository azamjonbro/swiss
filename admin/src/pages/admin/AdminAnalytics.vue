<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue';
import { useLocaleStore } from '@/stores/locale';
import { fetchAnalyticsSummary } from '@/services/analytics';
import { useLiveVisitors } from '@/composables/useLiveVisitors';
import { rangeFor } from '@/utils/dateRange';
import type { AnalyticsSummary, RangePreset } from '@/types/analytics';
import StatCard from '@/components/admin/StatCard.vue';
import AdminIcon from '@/components/shared/AdminIcon.vue';
import RangePicker from '@/components/analytics/RangePicker.vue';
import VisitorChart from '@/components/analytics/VisitorChart.vue';
import BreakdownList from '@/components/analytics/BreakdownList.vue';
import LiveVisitors from '@/components/analytics/LiveVisitors.vue';

/**
 * Visitor analytics, read from DataFast through this project's own API.
 *
 * The page makes exactly two kinds of request: one `summary` per date range,
 * and a `live` poll on a timer. Everything on screen below the live panel
 * comes out of that single summary payload, which is what keeps the page
 * inside DataFast's request budget no matter how often a range is reopened.
 */
const locale = useLocaleStore();

const preset = ref<RangePreset>('7d');
const initial = rangeFor('7d');
const from = ref(initial.from);
const to = ref(initial.to);

const summary = ref<AnalyticsSummary | null>(null);
const isLoading = ref(true);
const errorMessage = ref('');

const { data: liveData, isLoading: liveLoading, hasError: liveError } = useLiveVisitors();

let controller: AbortController | null = null;
/**
 * Identifies the request whose answer is allowed to land.
 *
 * Clicking through presets quickly starts several requests; only the newest
 * may write to the page. Without this, a slow earlier response could arrive
 * last and repaint the dashboard with a range the reader has already left.
 */
let requestId = 0;

async function load() {
  controller?.abort();
  controller = new AbortController();
  const id = ++requestId;

  isLoading.value = true;
  errorMessage.value = '';
  try {
    const data = await fetchAnalyticsSummary({ from: from.value, to: to.value }, controller.signal);
    if (id !== requestId) return;
    summary.value = data;
  } catch (err) {
    if (isAbort(err) || id !== requestId) return;
    // A range change that fails must not leave the previous range's figures on
    // screen under the new dates — that would be the wrong numbers, labelled.
    summary.value = null;
    errorMessage.value = messageFor(err);
  } finally {
    if (id === requestId) isLoading.value = false;
  }
}

function isAbort(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const { name, code } = err as { name?: string; code?: string };
  return name === 'CanceledError' || name === 'AbortError' || code === 'ERR_CANCELED';
}

/**
 * Turns a failed request into something the reader can act on.
 *
 * The two cases worth separating are "nobody has configured this yet" and
 * "the provider pushed back" — one is a setup task, the other is a wait.
 */
function messageFor(err: unknown): string {
  const status = (err as { response?: { status?: number } })?.response?.status;
  const code = (err as { response?: { data?: { code?: string } } })?.response?.data?.code;
  if (code === 'DATAFAST_NOT_CONFIGURED' || status === 503) return locale.t('admin.analyticsNotConfigured');
  if (status === 429) return locale.t('admin.analyticsRateLimited');
  return locale.t('admin.loadFailed');
}

function onRangeChange(next: { from: string; to: string; preset: RangePreset }) {
  from.value = next.from;
  to.value = next.to;
  preset.value = next.preset;
}

watch([from, to], () => void load(), { immediate: true });

onUnmounted(() => controller?.abort());

/* ---- derived display values ---- */

const overview = computed(() => summary.value?.overview ?? null);
const failed = computed(() => new Set(summary.value?.unavailable ?? []));

function metric(value: number | undefined): string {
  return typeof value === 'number' ? value.toLocaleString() : '—';
}

const bounceRate = computed(() => {
  const value = overview.value?.bounce_rate;
  return typeof value === 'number' ? `${value.toFixed(1)}%` : '—';
});

/** DataFast reports the average session in seconds; minutes read better. */
const avgDuration = computed(() => {
  const seconds = overview.value?.avg_session_duration;
  if (typeof seconds !== 'number') return '—';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  return `${Math.floor(seconds / 60)}m ${String(Math.round(seconds % 60)).padStart(2, '0')}s`;
});

const newVsReturning = computed(() => {
  const breakdown = overview.value?.visitorBreakdown;
  const isNew = breakdown?.new ?? overview.value?.new_visitors;
  const returning = breakdown?.returning ?? overview.value?.returning_visitors;
  if (typeof isNew !== 'number' || typeof returning !== 'number') return null;
  const total = isNew + returning;
  return {
    new: isNew,
    returning,
    newPct: total ? Math.round((isNew / total) * 100) : 0,
  };
});

const goals = computed(() => summary.value?.goals ?? []);
</script>

<template>
  <div>
    <div class="sw-admin-page-head">
      <div>
        <h1 class="sw-admin-page-title">{{ locale.t('admin.analytics') }}</h1>
        <p class="sw-admin-page-sub">{{ locale.t('admin.analyticsSub') }}</p>
      </div>
      <div class="sw-admin-page-head__actions">
        <RangePicker :from="from" :to="to" :preset="preset" :busy="isLoading" @change="onRangeChange" />
      </div>
    </div>

    <!-- Live stands apart from the range: it is always "now", whatever window
         the rest of the page is showing. -->
    <LiveVisitors :data="liveData" :is-loading="liveLoading" :has-error="liveError" />

    <p v-if="errorMessage" class="sw-an__error">
      <AdminIcon name="alert" :size="16" />
      <span>{{ errorMessage }}</span>
      <button type="button" class="sw-admin-btn sw-admin-btn--sm sw-admin-btn--ghost" @click="load()">
        {{ locale.t('admin.analyticsRetry') }}
      </button>
    </p>

    <template v-else>
      <div v-if="isLoading && !summary" class="sw-an__stats">
        <div v-for="n in 4" :key="n" class="sw-admin-skeleton sw-an__stat-skeleton" />
      </div>

      <div v-else class="sw-an__stats">
        <StatCard :label="locale.t('admin.analyticsVisitors')" :value="metric(overview?.visitors)" icon="globe" />
        <StatCard :label="locale.t('admin.analyticsSessions')" :value="metric(overview?.sessions)" icon="dashboard" />
        <StatCard :label="locale.t('admin.analyticsPageViews')" :value="metric(overview?.pageviews)" icon="eye" />
        <StatCard :label="locale.t('admin.analyticsBounceRate')" :value="bounceRate" icon="arrowDown" />
      </div>

      <div class="sw-an__secondary">
        <div class="sw-an__pill">
          <span class="sw-an__pill-label">{{ locale.t('admin.analyticsAvgSession') }}</span>
          <span class="sw-an__pill-value">{{ avgDuration }}</span>
        </div>
        <div v-if="newVsReturning" class="sw-an__pill sw-an__pill--split">
          <span class="sw-an__pill-label">{{ locale.t('admin.analyticsNewVsReturning') }}</span>
          <span class="sw-an__pill-value">
            {{ newVsReturning.new.toLocaleString() }} / {{ newVsReturning.returning.toLocaleString() }}
          </span>
          <span class="sw-an__meter" aria-hidden="true">
            <span class="sw-an__meter-fill" :style="{ width: `${newVsReturning.newPct}%` }" />
          </span>
          <span class="sw-an__pill-note">{{ newVsReturning.newPct }}% {{ locale.t('admin.analyticsNew') }}</span>
        </div>
      </div>

      <VisitorChart :points="summary?.timeseries ?? []" :interval="summary?.range.interval ?? 'day'"
        :unavailable="failed.has('timeseries')" />

      <div class="sw-an__grid">
        <BreakdownList :title="locale.t('admin.analyticsChannels')" :rows="summary?.channels ?? []"
          :unavailable="failed.has('referrers')" :note="locale.t('admin.analyticsChannelsNote')" />
        <BreakdownList :title="locale.t('admin.analyticsReferrers')" :rows="summary?.referrers ?? []"
          :unavailable="failed.has('referrers')" />
        <BreakdownList :title="locale.t('admin.analyticsTopPages')" :rows="summary?.pages ?? []"
          :unavailable="failed.has('pages')" :note="locale.t('admin.analyticsPagesNote')" :limit="10" />
        <BreakdownList :title="locale.t('admin.analyticsCampaigns')" :rows="summary?.campaigns ?? []"
          :unavailable="failed.has('campaigns')" />
        <BreakdownList :title="locale.t('admin.analyticsCountries')" :rows="summary?.countries ?? []"
          :unavailable="failed.has('countries')" />
        <BreakdownList :title="locale.t('admin.analyticsCities')" :rows="summary?.cities ?? []"
          :unavailable="failed.has('cities')" />
        <BreakdownList :title="locale.t('admin.analyticsDevices')" :rows="summary?.devices ?? []"
          :unavailable="failed.has('devices')" :limit="4" />
        <BreakdownList :title="locale.t('admin.analyticsBrowsers')" :rows="summary?.browsers ?? []"
          :unavailable="failed.has('browsers')" :limit="6" />
        <BreakdownList :title="locale.t('admin.analyticsOperatingSystems')" :rows="summary?.operatingSystems ?? []"
          :unavailable="failed.has('operatingSystems')" :limit="6" />
      </div>

      <section class="sw-admin-card sw-an__goals">
        <header class="sw-an__goals-head">
          <h2 class="sw-an__goals-title">{{ locale.t('admin.analyticsConversions') }}</h2>
          <p class="sw-an__goals-note">{{ locale.t('admin.analyticsConversionsNote') }}</p>
        </header>

        <p v-if="failed.has('goals')" class="sw-an__goals-empty">{{ locale.t('admin.analyticsSectionFailed') }}</p>
        <p v-else-if="!goals.length" class="sw-an__goals-empty">{{ locale.t('admin.analyticsNoGoals') }}</p>

        <div v-else class="sw-admin-table-wrap">
          <table class="sw-admin-table">
            <thead>
              <tr>
                <th>{{ locale.t('admin.analyticsGoal') }}</th>
                <th>{{ locale.t('admin.analyticsCompletions') }}</th>
                <th>{{ locale.t('admin.analyticsVisitors') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="goal in goals" :key="goal.label">
                <td><code class="sw-an__goal-name">{{ goal.label }}</code></td>
                <td class="sw-an__num">{{ goal.completions.toLocaleString() }}</td>
                <td class="sw-an__num">{{ goal.visitors.toLocaleString() }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <p v-if="summary" class="sw-an__foot">
        {{ locale.t('admin.analyticsRangeFoot') }} {{ summary.range.from }} → {{ summary.range.to }}
        ({{ summary.range.timezone }})
      </p>
    </template>
  </div>
</template>

<style scoped>
.sw-an__stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(184px, 1fr));
  gap: 16px;
  margin-top: 18px;
}

.sw-an__stat-skeleton {
  height: 128px;
  border-radius: var(--radius-lg);
}

.sw-an__secondary {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin: 14px 0 18px;
}

.sw-an__pill {
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
  padding: 11px 15px;
  border-radius: var(--radius-md);
  border: 1px solid var(--admin-border);
  background: var(--admin-surface);
  box-shadow: var(--shadow-xs);
}

.sw-an__pill-label {
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--admin-text-subtle);
}

.sw-an__pill-value {
  font-size: 0.95rem;
  font-weight: 640;
  font-variant-numeric: tabular-nums;
}

.sw-an__pill-note {
  font-size: 0.74rem;
  color: var(--admin-text-muted);
  font-variant-numeric: tabular-nums;
}

.sw-an__meter {
  display: block;
  width: 84px;
  height: 5px;
  border-radius: var(--radius-full);
  background: var(--admin-surface-3);
  overflow: hidden;
}

.sw-an__meter-fill {
  display: block;
  height: 100%;
  background: var(--admin-accent);
}

.sw-an__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
  margin-top: 16px;
}

.sw-an__goals {
  margin-top: 16px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sw-an__goals-head {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.sw-an__goals-title {
  margin: 0;
  font-size: 0.75rem;
  font-weight: 650;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--admin-text-muted);
}

.sw-an__goals-note,
.sw-an__goals-empty,
.sw-an__foot {
  margin: 0;
  font-size: 0.78rem;
  color: var(--admin-text-subtle);
}

.sw-an__foot {
  margin-top: 18px;
  font-variant-numeric: tabular-nums;
}

.sw-an__goal-name {
  font-family: ui-monospace, 'SF Mono', Menlo, monospace;
  font-size: 0.8rem;
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  background: var(--admin-surface-3);
}

.sw-an__num {
  font-variant-numeric: tabular-nums;
}

.sw-an__error {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin: 18px 0 0;
  padding: 14px 16px;
  border-radius: var(--radius-md);
  border: 1px solid var(--admin-border);
  border-left: 3px solid var(--admin-danger);
  background: var(--admin-surface);
  font-size: 0.86rem;
  color: var(--admin-text);
}

.sw-an__error :deep(svg) {
  color: var(--admin-danger);
  flex-shrink: 0;
}

.sw-an__error button {
  margin-left: auto;
}
</style>
