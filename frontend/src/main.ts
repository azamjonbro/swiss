import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import { useThemeStore } from '@/stores/theme';
import { useLocaleStore } from '@/stores/locale';
import { prefersReducedMotion } from '@/composables/useReducedMotion';
import '@/assets/scss/global.scss';

const app = createApp(App);

app.use(createPinia());
app.use(router);

// Instantiate before mount so the <html> theme/lang attributes are set
// before first paint, avoiding a flash of the wrong theme or language.
useThemeStore();
useLocaleStore();

app.mount('#app');

function hidePreloader() {
  const el = document.getElementById('sw-preloader');
  document.body.classList.remove('sw-loading');
  if (!el) return;
  el.classList.add('sw-preloader--done');
  const remove = () => el.remove();
  el.addEventListener('transitionend', remove, { once: true });
  setTimeout(remove, 900);
}

const fontsReady = document.fonts?.ready ?? Promise.resolve();
const minDisplay = new Promise<void>((resolve) => setTimeout(resolve, prefersReducedMotion() ? 150 : 1000));

Promise.all([fontsReady, minDisplay]).then(hidePreloader);
