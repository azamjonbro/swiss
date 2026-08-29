<script setup lang="ts">
import { computed } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useLocaleStore } from '@/stores/locale';
import { useThemeStore } from '@/stores/theme';
import { SUPPORTED_LANGS, LANG_LABELS, type Lang } from '@/i18n';
import AdminIcon from '@/components/shared/AdminIcon.vue';

const auth = useAuthStore();
const locale = useLocaleStore();
const theme = useThemeStore();

const initials = computed(() =>
  (auth.admin?.name ?? '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join(''),
);
</script>

<template>
  <div>
    <div class="sw-admin-page-head">
      <div>
        <h1 class="sw-admin-page-title">{{ locale.t('admin.settings') }}</h1>
        <p class="sw-admin-page-sub">{{ locale.t('admin.accountSub') }}</p>
      </div>
    </div>

    <div class="sw-set__grid">
      <section class="sw-admin-card sw-set__card">
        <header class="sw-set__head">
          <h2 class="sw-set__title">{{ locale.t('admin.account') }}</h2>
        </header>

        <div class="sw-set__identity">
          <span class="sw-set__avatar">{{ initials }}</span>
          <div>
            <p class="sw-set__name">{{ auth.admin?.name }}</p>
            <p class="sw-set__email">{{ auth.admin?.email }}</p>
          </div>
        </div>

        <dl class="sw-set__list">
          <div>
            <dt>{{ locale.t('admin.role') }}</dt>
            <dd><span class="sw-admin-badge sw-admin-badge--accent">{{ auth.admin?.role }}</span></dd>
          </div>
        </dl>
      </section>

      <section class="sw-admin-card sw-set__card">
        <header class="sw-set__head">
          <h2 class="sw-set__title">{{ locale.t('admin.appearance') }}</h2>
          <p class="sw-set__sub">{{ locale.t('admin.appearanceSub') }}</p>
        </header>

        <div class="sw-set__row">
          <span class="sw-set__row-label">{{ locale.t('admin.theme') }}</span>
          <div class="sw-set__segmented">
            <button
              type="button"
              :class="{ 'is-active': theme.mode === 'light' }"
              @click="theme.setMode('light')"
            >
              <AdminIcon name="eye" :size="14" />
              {{ locale.t('prefs.light') }}
            </button>
            <button type="button" :class="{ 'is-active': theme.mode === 'dark' }" @click="theme.setMode('dark')">
              <AdminIcon name="eyeOff" :size="14" />
              {{ locale.t('prefs.dark') }}
            </button>
          </div>
        </div>

        <div class="sw-set__row">
          <span class="sw-set__row-label">{{ locale.t('admin.interfaceLanguage') }}</span>
          <div class="sw-set__segmented">
            <button
              v-for="lang in SUPPORTED_LANGS"
              :key="lang"
              type="button"
              :class="{ 'is-active': locale.lang === lang }"
              @click="locale.setLang(lang as Lang)"
            >
              {{ LANG_LABELS[lang] }}
            </button>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.sw-set__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  max-width: 860px;
}

.sw-set__card {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.sw-set__head {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--admin-border);
}

.sw-set__title {
  font-size: 0.78rem;
  font-weight: 650;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--admin-text-muted);
}

.sw-set__sub {
  font-size: 0.78rem;
  color: var(--admin-text-subtle);
}

.sw-set__identity {
  display: flex;
  align-items: center;
  gap: 14px;
}

.sw-set__avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 46px;
  flex: none;
  border-radius: var(--radius-full);
  background: var(--admin-accent-soft);
  color: var(--admin-accent);
  font-size: 1rem;
  font-weight: 650;
}

.sw-set__name {
  font-size: 0.98rem;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.sw-set__email {
  margin-top: 2px;
  font-size: 0.82rem;
  color: var(--admin-text-muted);
}

.sw-set__list div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.sw-set__list dt {
  font-size: 0.85rem;
  color: var(--admin-text-muted);
}

.sw-set__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;
}

.sw-set__row-label {
  font-size: 0.85rem;
  color: var(--admin-text-muted);
}

.sw-set__segmented {
  display: flex;
  gap: 3px;
  padding: 3px;
  border-radius: var(--radius-md);
  background: var(--admin-surface-3);
}

.sw-set__segmented button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
  font-weight: 550;
  color: var(--admin-text-muted);
  transition: background var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out),
    box-shadow var(--dur-fast) var(--ease-out);
}

.sw-set__segmented button.is-active {
  background: var(--admin-surface);
  color: var(--admin-text);
  box-shadow: var(--shadow-xs);
}
</style>
