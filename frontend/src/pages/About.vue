<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import EditorialSection from '@/components/home/EditorialSection.vue';
import CtaSection from '@/components/home/CtaSection.vue';
import SmartImage from '@/components/shared/SmartImage.vue';
import { useLocaleStore } from '@/stores/locale';
import { fetchBranches, branchAddressLine, type Branch } from '@/services/branches';
import { telHref } from '@/seo/schema.mjs';
import { trackGoal } from '@/utils/analytics';

const locale = useLocaleStore();

const aboutImage = '/images/swisswatch_about.jpg';
const standardImage = '/images/swisswatch_standard.jpg';
const networkImage = '/images/swisswatch_network.jpg';

/**
 * Maison names, not copy — the same fourteen in every language, so they live
 * here rather than being triplicated across the three dictionaries where they
 * could silently drift apart. Order is the boutique's own.
 */
const PORTFOLIO = [
  'Frederique Constant',
  'Maurice Lacroix',
  'Tissot',
  'Certina',
  'Saint Honoré',
  'West End Watch Co.',
  'Roamer',
  'Swiss Military Hanowa',
  'Jacques Philippe',
  'TSAR BOMBA',
  'Citizen',
  'Seiko',
  'Orient',
  'Cerruti 1881',
];

/** The four the boutique distributes exclusively in Uzbekistan. */
const EXCLUSIVE = ['West End Watch Co.', 'Saint Honoré', 'TSAR BOMBA', 'Jacques Philippe'];

// Managed in the admin panel (Branch), so this is a fetch rather than a
// constant. An empty list — or a request that fails — renders no section at
// all: a "Boutiques" heading over nothing is worse than not asking.
const branches = ref<Branch[]>([]);

async function loadBranches() {
  try {
    branches.value = await fetchBranches();
  } catch {
    branches.value = [];
  }
}

onMounted(loadBranches);
// The API localises the names and addresses it returns, so a language change
// has to re-ask rather than re-render what the previous language sent.
watch(() => locale.lang, loadBranches);
</script>

<template>
  <div class="sw-about">
    <section class="sw-about__hero">
      <SmartImage :src="aboutImage" alt="The SwissWatch Premium atelier" eager />
      <div class="sw-about__hero-overlay" />
      <div class="sw-about__hero-content">
        <span class="sw-eyebrow">{{ locale.t('about.eyebrow') }}</span>
        <h1 class="sw-display">{{ locale.t('about.title') }}</h1>
      </div>
    </section>

    <section class="sw-about__intro">
      <p class="sw-body-lg">{{ locale.t('about.intro') }}</p>
    </section>

    <EditorialSection
      :eyebrow="locale.t('about.storyEyebrow')"
      :title="locale.t('about.storyTitle')"
      :body="locale.t('about.storyBody')"
      :image="standardImage"
    />

    <EditorialSection
      :eyebrow="locale.t('about.legacyEyebrow')"
      :title="locale.t('about.legacyTitle')"
      :body="locale.t('about.legacyBody')"
      :image="networkImage"
      reverse
    />

    <section class="sw-about__brands">
      <span class="sw-eyebrow">{{ locale.t('about.portfolioEyebrow') }}</span>
      <h2 class="sw-h1">{{ locale.t('about.portfolioTitle') }}</h2>
      <ul class="sw-about__brand-list">
        <li v-for="brand in PORTFOLIO" :key="brand">{{ brand }}</li>
      </ul>

      <!-- Set apart rather than marked inside the list above: four of these
           fourteen are exclusive, and a footnote on a wrapped list is not a
           claim anyone reads. -->
      <div class="sw-about__exclusive">
        <span class="sw-eyebrow">{{ locale.t('about.exclusiveTitle') }}</span>
        <ul class="sw-about__brand-list sw-about__brand-list--accent">
          <li v-for="brand in EXCLUSIVE" :key="brand">{{ brand }}</li>
        </ul>
      </div>
    </section>

    <section class="sw-about__warranty">
      <span class="sw-eyebrow">{{ locale.t('about.warrantyEyebrow') }}</span>
      <h2 class="sw-h2">{{ locale.t('about.warrantyTitle') }}</h2>
      <p class="sw-body-lg">{{ locale.t('about.warrantyBody') }}</p>
    </section>

    <section v-if="branches.length" class="sw-about__branches">
      <span class="sw-eyebrow">{{ locale.t('about.branchesEyebrow') }}</span>
      <h2 class="sw-h1">{{ locale.t('about.branchesTitle') }}</h2>
      <ul class="sw-about__branch-list">
        <li v-for="branch in branches" :key="branch._id" class="sw-about__branch">
          <h3 class="sw-about__branch-name">{{ branch.name }}</h3>
          <p v-if="branchAddressLine(branch)" class="sw-body sw-about__branch-address">
            {{ branchAddressLine(branch) }}
          </p>
          <p v-for="number in branch.phones ?? []" :key="number" class="sw-about__branch-phone">
            <a :href="telHref(number)" @click="trackGoal('phone_click')">{{ number }}</a>
          </p>
          <div v-if="branch.openingHours?.length" class="sw-about__branch-hours">
            <span class="sw-label">{{ locale.t('about.branchesHours') }}</span>
            <span v-for="line in branch.openingHours" :key="line">{{ line }}</span>
          </div>
          <a
            v-if="branch.mapUrl"
            class="sw-about__branch-map"
            :href="branch.mapUrl"
            target="_blank"
            rel="noopener"
          >{{ locale.t('about.branchesMap') }} <span aria-hidden="true">&rarr;</span></a>
        </li>
      </ul>
    </section>

    <p class="sw-about__closing">{{ locale.t('about.closing') }}</p>

    <CtaSection />
  </div>
</template>

<style scoped>
.sw-about__hero {
  position: relative;
  height: min(70svh, 720px);
  min-height: 440px;
  color: var(--sw-white);
}

/* Weighted toward the base, where the title sits, plus a light wash across the
   top so the header's small type stays readable over a bright photograph. */
.sw-about__hero-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    rgba(6, 6, 6, 0.42) 0%,
    rgba(6, 6, 6, 0.16) 26%,
    rgba(6, 6, 6, 0.52) 68%,
    rgba(6, 6, 6, 0.82) 100%
  );
}

.sw-about__hero-content {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  max-width: var(--container-max);
  margin-inline: auto;
  padding: 0 var(--container-pad) clamp(48px, 6vw, 80px);
}

.sw-about__hero-content .sw-eyebrow {
  display: block;
  margin-bottom: 24px;
  color: rgba(253, 252, 250, 0.62);
}

.sw-about__hero-content .sw-display {
  max-width: 14ch;
}

.sw-about__intro {
  max-width: 760px;
  margin: 0 auto;
  padding: clamp(64px, 8vw, 120px) var(--container-pad);
  text-align: center;
}

.sw-about__brands,
.sw-about__warranty,
.sw-about__branches {
  max-width: var(--container-max);
  margin-inline: auto;
  padding: var(--space-section-sm) var(--container-pad);
}

.sw-about__brands .sw-h1,
.sw-about__branches .sw-h1,
.sw-about__warranty .sw-h2 {
  margin-top: 18px;
}

/* A column count rather than a flex wrap: these are names of different lengths
   and a ragged wrapped row reads as a sentence with odd punctuation. Columns
   keep them a list. */
.sw-about__brand-list {
  margin-top: 36px;
  columns: 4 190px;
  column-gap: var(--space-gutter);
}

.sw-about__brand-list li {
  break-inside: avoid;
  padding: 10px 0;
  border-bottom: 1px solid var(--hairline);
  font-size: 1rem;
}

.sw-about__exclusive {
  margin-top: clamp(48px, 6vw, 84px);
  padding-top: clamp(32px, 4vw, 48px);
  border-top: 1px solid var(--border);
}

.sw-about__brand-list--accent {
  margin-top: 20px;
  columns: 4 190px;
}

.sw-about__brand-list--accent li {
  color: var(--accent);
  font-weight: 500;
}

.sw-about__warranty {
  max-width: 860px;
}

.sw-about__warranty .sw-body-lg {
  margin-top: 20px;
}

.sw-about__branch-list {
  margin-top: 44px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-gutter);
}

.sw-about__branch {
  padding-top: 24px;
  border-top: 1px solid var(--border);
}

.sw-about__branch-name {
  font-size: 1.125rem;
  font-weight: 500;
}

.sw-about__branch-address {
  margin-top: 12px;
  color: var(--text-muted);
}

.sw-about__branch-phone {
  margin-top: 8px;
}

.sw-about__branch-phone a {
  border-bottom: 1px solid var(--hairline);
  transition: border-color var(--dur-fast) var(--ease-out);
}

.sw-about__branch-phone a:hover {
  border-bottom-color: currentColor;
}

.sw-about__branch-hours {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 16px;
  color: var(--text-muted);
  font-size: 0.875rem;
}

.sw-about__branch-map {
  display: inline-block;
  margin-top: 16px;
  font-size: 0.75rem;
  font-weight: 500;
  letter-spacing: 0.2em;
  text-transform: uppercase;
}

.sw-about__closing {
  max-width: 720px;
  margin: 0 auto;
  padding: 0 var(--container-pad) var(--space-section-sm);
  text-align: center;
  font-size: clamp(1.0625rem, 2vw, 1.375rem);
  font-style: italic;
  color: var(--text-muted);
}
</style>
