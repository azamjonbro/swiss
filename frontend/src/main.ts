import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import { useThemeStore } from '@/stores/theme';
import { useLocaleStore } from '@/stores/locale';
import { useAccountStore } from '@/stores/account';
import revealPlugin from '@/directives/reveal';
import { initAnalytics } from '@/utils/analytics';
// Lenis ships a stylesheet it genuinely depends on, and the one rule that
// matters here is `html.lenis, html.lenis body { height: auto }` — it undoes
// the `height: 100%` the reset puts on both. Without it the element Lenis
// measures is pinned to the viewport instead of growing with the page.
import 'lenis/dist/lenis.css';
import '@/assets/scss/global.scss';

/**
 * Hides the loading panel.
 *
 * There is no minimum display time. The old one-second floor held an opaque
 * panel over content that was already painted, which meant the browser's
 * largest contentful paint was a spinner rather than the hero — a second of
 * LCP given away for a transition nobody asked for. The panel now lives
 * exactly as long as the app takes to become interactive.
 */
function hidePreloader() {
  const el = document.getElementById('sw-preloader');
  document.body.classList.remove('sw-loading');
  // Marks the intro as played, so the rest of the session paints prerendered
  // content on first frame instead of covering it (see index.html).
  try {
    sessionStorage.setItem('sw-intro', 'done');
  } catch {
    /* storage disabled — the intro simply plays again */
  }
  // The hero holds its entrance until this fires, so the staged reveal isn't
  // played behind an opaque panel.
  window.dispatchEvent(new CustomEvent('sw:preloader-done'));
  if (!el) return;
  el.classList.add('sw-preloader--done');
  const remove = () => el.remove();
  el.addEventListener('transitionend', remove, { once: true });
  setTimeout(remove, 900);
}

async function bootstrap() {
  const app = createApp(App);

  app.use(createPinia());
  app.use(router);
  app.use(revealPlugin);

  // Instantiate before mount so the <html> theme/lang attributes are set
  // before first paint, avoiding a flash of the wrong theme or language.
  useThemeStore();
  const locale = useLocaleStore();

  // Resolve any stored customer session up front — not awaited, so it never delays
  // first paint. The router guard awaits the same in-flight promise when a deep
  // link into /account needs the answer before it can decide.
  void useAccountStore().restoreSession();

  // The only thing worth blocking the mount on: rendering before the active
  // dictionary has arrived would paint raw translation keys. It is one small
  // chunk, and the panel above is still covering the page while it lands.
  await locale.ready();

  // Before the mount, not after. Every route ships a prerendered copy of its
  // HTML, and mounting replaces #app wholesale — so mounting with the route
  // still unresolved rendered the shell around an empty <main>, snapping the
  // footer up from the foot of the prerendered document to just under the
  // header, then dropping it back a moment later when the chunk arrived. That
  // one bounce was 0.657 CLS, the site's entire score. Waiting here means the
  // first Vue render already contains the page, and the footer never moves.
  await router.isReady();

  app.mount('#app');

  // One frame later that render has been painted, and the panel has nothing
  // left to hide.
  requestAnimationFrame(hidePreloader);

  // Everything below is off the critical path.
  locale.prefetch();
  // Visitor analytics. After the mount on purpose: it must never sit between
  // the visitor and the first paint the preloader is waiting on.
  initAnalytics();
}

void bootstrap();
