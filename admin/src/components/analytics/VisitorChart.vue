<script setup lang="ts">
import { computed, ref } from 'vue';
import { useLocaleStore } from '@/stores/locale';
import type { TimeseriesPoint } from '@/types/analytics';

/**
 * The visitor time series, drawn as inline SVG.
 *
 * No chart library: the admin bundle carries four dependencies in total, and
 * the smallest charting package would be larger than all of them together for
 * one line. Drawing it here also means the marks take their colours from the
 * admin's own CSS variables, so the chart is correct in both themes without a
 * second palette to maintain.
 *
 * One scale governs everything. `y()` maps a value to a row, and the grid
 * lines, the axis labels and the plotted points all go through it — so every
 * label names a value the chart actually reaches.
 */
const props = defineProps<{
  points: TimeseriesPoint[];
  /** 'hour' for a single day, 'day' for anything longer. Sets tick labels. */
  interval: 'hour' | 'day';
  unavailable?: boolean;
}>();

const locale = useLocaleStore();

/** User units. Text is authored at this scale and the SVG is width-responsive. */
const W = 800;
const H = 240;
const PAD = { top: 18, right: 16, bottom: 28, left: 44 };

const plotW = W - PAD.left - PAD.right;
const plotH = H - PAD.top - PAD.bottom;

const values = computed(() => props.points.map((p) => Number(p.visitors ?? 0)));

/**
 * The top of the scale, rounded up to something a person would choose.
 *
 * A raw maximum puts the peak exactly on the top gridline and gives axis
 * labels like "37"; rounding to a 1/2/5 step keeps the labels readable and
 * leaves the peak visibly below the ceiling.
 */
const scaleMax = computed(() => {
  const peak = Math.max(...values.value, 0);
  if (peak <= 4) return 4;
  const magnitude = 10 ** Math.floor(Math.log10(peak));
  const step = [1, 2, 5, 10].find((s) => peak <= s * magnitude) ?? 10;
  return step * magnitude;
});

function x(index: number): number {
  if (props.points.length <= 1) return PAD.left + plotW / 2;
  return PAD.left + (index / (props.points.length - 1)) * plotW;
}

function y(value: number): number {
  return PAD.top + plotH - (value / scaleMax.value) * plotH;
}

const gridLines = computed(() =>
  [0, 0.25, 0.5, 0.75, 1].map((fraction) => ({
    value: Math.round(scaleMax.value * fraction),
    y: y(scaleMax.value * fraction),
  })),
);

const linePath = computed(() => {
  if (!values.value.length) return '';
  return values.value.map((value, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(2)},${y(value).toFixed(2)}`).join(' ');
});

/** The line closed down to the baseline, so the area can be filled. */
const areaPath = computed(() => {
  if (!values.value.length) return '';
  const base = y(0).toFixed(2);
  return `${linePath.value} L${x(values.value.length - 1).toFixed(2)},${base} L${x(0).toFixed(2)},${base} Z`;
});

const last = computed(() => values.value.length - 1);

/** First, middle and last — enough to orient without crowding the axis. */
const xTicks = computed(() => {
  const n = props.points.length;
  if (!n) return [];
  const indexes = n <= 2 ? [...props.points.keys()] : [0, Math.floor((n - 1) / 2), n - 1];
  return [...new Set(indexes)].map((i) => ({ i, label: tickLabel(props.points[i]?.timestamp) }));
});

function tickLabel(timestamp?: string): string {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '';
  return props.interval === 'hour'
    ? date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

/* ---- hover ---- */

const hovered = ref<number | null>(null);

function onMove(event: PointerEvent) {
  const box = (event.currentTarget as HTMLElement).getBoundingClientRect();
  if (!box.width || props.points.length === 0) return;
  // Pointer position → user units → nearest sample.
  const userX = ((event.clientX - box.left) / box.width) * W;
  const ratio = (userX - PAD.left) / plotW;
  const index = Math.round(ratio * (props.points.length - 1));
  hovered.value = Math.min(Math.max(index, 0), props.points.length - 1);
}

const tooltip = computed(() => {
  if (hovered.value === null) return null;
  const point = props.points[hovered.value];
  if (!point) return null;
  return {
    // Percentages, so the tooltip tracks the responsive width of the SVG.
    left: `${(x(hovered.value) / W) * 100}%`,
    label: fullLabel(point.timestamp),
    visitors: Number(point.visitors ?? 0),
    pageviews: Number(point.pageviews ?? 0),
  };
});

function fullLabel(timestamp?: string): string {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '';
  return props.interval === 'hour'
    ? date.toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}
</script>

<template>
  <section class="sw-admin-card sw-chart">
    <header class="sw-chart__head">
      <h2 class="sw-chart__title">{{ locale.t('admin.analyticsVisitorsOverTime') }}</h2>
    </header>

    <p v-if="unavailable" class="sw-chart__empty">{{ locale.t('admin.analyticsSectionFailed') }}</p>
    <p v-else-if="!points.length" class="sw-chart__empty">{{ locale.t('admin.analyticsNoData') }}</p>

    <div v-else class="sw-chart__plot" @pointermove="onMove" @pointerleave="hovered = null">
      <svg :viewBox="`0 0 ${W} ${H}`" class="sw-chart__svg" role="img"
        :aria-label="locale.t('admin.analyticsVisitorsOverTime')">
        <defs>
          <linearGradient id="sw-chart-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="var(--admin-accent)" stop-opacity="0.22" />
            <stop offset="100%" stop-color="var(--admin-accent)" stop-opacity="0.02" />
          </linearGradient>
        </defs>

        <g class="sw-chart__grid">
          <template v-for="line in gridLines" :key="line.value">
            <line :x1="PAD.left" :x2="W - PAD.right" :y1="line.y" :y2="line.y" />
            <text :x="PAD.left - 9" :y="line.y + 4" text-anchor="end">{{ line.value.toLocaleString() }}</text>
          </template>
        </g>

        <path :d="areaPath" fill="url(#sw-chart-fill)" stroke="none" />
        <path :d="linePath" fill="none" stroke="var(--admin-accent)" stroke-width="2" stroke-linecap="round"
          stroke-linejoin="round" />

        <!-- The most recent value is the one the reader is looking for. -->
        <circle v-if="values.length" :cx="x(last)" :cy="y(values[last])" r="3.5" fill="var(--admin-accent)"
          stroke="var(--admin-surface)" stroke-width="2" />

        <template v-if="hovered !== null">
          <line class="sw-chart__guide" :x1="x(hovered)" :x2="x(hovered)" :y1="PAD.top" :y2="PAD.top + plotH" />
          <circle :cx="x(hovered)" :cy="y(values[hovered])" r="4" fill="var(--admin-surface)"
            stroke="var(--admin-accent)" stroke-width="2" />
        </template>

        <g class="sw-chart__xaxis">
          <text v-for="tick in xTicks" :key="tick.i" :x="x(tick.i)" :y="H - 8"
            :text-anchor="tick.i === 0 ? 'start' : tick.i === points.length - 1 ? 'end' : 'middle'">
            {{ tick.label }}
          </text>
        </g>
      </svg>

      <div v-if="tooltip" class="sw-chart__tip" :style="{ left: tooltip.left }">
        <span class="sw-chart__tip-date">{{ tooltip.label }}</span>
        <span class="sw-chart__tip-row">
          <b>{{ tooltip.visitors.toLocaleString() }}</b> {{ locale.t('admin.analyticsVisitors') }}
        </span>
        <span class="sw-chart__tip-row sw-chart__tip-row--sub">
          {{ tooltip.pageviews.toLocaleString() }} {{ locale.t('admin.analyticsPageViews') }}
        </span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.sw-chart {
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sw-chart__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.sw-chart__title {
  margin: 0;
  font-size: 0.75rem;
  font-weight: 650;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--admin-text-muted);
}

.sw-chart__plot {
  position: relative;
}

.sw-chart__svg {
  display: block;
  width: 100%;
  height: auto;
  overflow: visible;
}

.sw-chart__grid line {
  stroke: var(--admin-border);
  stroke-width: 1;
}

.sw-chart__grid text,
.sw-chart__xaxis text {
  fill: var(--admin-text-subtle);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.sw-chart__guide {
  stroke: var(--admin-border-strong);
  stroke-width: 1;
  stroke-dasharray: 3 3;
}

.sw-chart__tip {
  position: absolute;
  top: 0;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 8px 11px;
  border-radius: var(--radius-md);
  background: var(--admin-surface);
  border: 1px solid var(--admin-border-strong);
  box-shadow: var(--shadow-md);
  pointer-events: none;
  white-space: nowrap;
  font-size: 0.78rem;
}

.sw-chart__tip-date {
  font-size: 0.7rem;
  color: var(--admin-text-subtle);
}

.sw-chart__tip-row {
  font-variant-numeric: tabular-nums;
}

.sw-chart__tip-row--sub {
  color: var(--admin-text-muted);
}

.sw-chart__empty {
  margin: 0;
  padding: 28px 0;
  text-align: center;
  font-size: 0.85rem;
  color: var(--admin-text-subtle);
}
</style>
