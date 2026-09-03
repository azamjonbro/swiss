import { createRouter, createWebHistory, type RouteLocationGeneric, type RouteLocationNormalized } from 'vue-router';
import { applyJsonLd, applySeo, site, siteJsonLd } from '@/utils/seo';
import { staticSeo, STORES_PATH } from '@/seo/schema.mjs';
import { hasStoreLocations } from '@/data/locations';
import { useAccountStore } from '@/stores/account';
import { resetScroll } from '@/composables/useLenis';
import { trackPageview } from '@/utils/analytics';

const routes = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/pages/Home.vue'),
    meta: { headerTheme: 'transparent' },
  },
  {
    path: '/watches',
    name: 'watches',
    component: () => import('@/pages/WatchList.vue'),
    meta: { headerTheme: 'light' },
  },
  {
    // Products live under /products/:slug. The former /watches/:slug is kept
    // as a permanent redirect (mirrored by a 308 at the Vercel edge, so a
    // crawler or a pasted link gets the status code, not just a client-side
    // hop) — /watches stays the catalog listing.
    path: '/watches/:slug',
    redirect: (to: RouteLocationGeneric) => ({
      name: 'product-detail',
      params: { slug: to.params.slug },
      query: to.query,
    }),
  },
  {
    path: '/products/:slug',
    name: 'product-detail',
    component: () => import('@/pages/WatchDetail.vue'),
    meta: { headerTheme: 'light' },
  },
  {
    path: '/brands',
    name: 'brands',
    component: () => import('@/pages/BrandList.vue'),
    meta: { headerTheme: 'light' },
  },
  {
    path: '/brands/:slug',
    name: 'brand-detail',
    component: () => import('@/pages/BrandDetail.vue'),
    meta: { headerTheme: 'light' },
  },
  {
    path: '/collections',
    name: 'collections',
    component: () => import('@/pages/CollectionList.vue'),
    meta: { headerTheme: 'light' },
  },
  {
    path: '/collections/:slug',
    name: 'collection-detail',
    component: () => import('@/pages/CollectionDetail.vue'),
    meta: { headerTheme: 'light' },
  },
  // Boutiques. The route exists only once `src/data/locations.json` holds a
  // real address: with an empty file there is nothing to show, so the path
  // falls through to the 404 route instead of rendering an empty page — and
  // the prerenderer and the sitemap leave it out on the same condition.
  ...(hasStoreLocations
    ? [
        {
          path: STORES_PATH,
          name: 'stores',
          component: () => import('@/pages/Stores.vue'),
          meta: { headerTheme: 'light' },
        },
      ]
    : []),
  {
    path: '/about',
    name: 'about',
    component: () => import('@/pages/About.vue'),
    meta: { headerTheme: 'light' },
  },
  {
    path: '/contact',
    name: 'contact',
    component: () => import('@/pages/Contact.vue'),
    meta: { headerTheme: 'light' },
  },
  // ---- Customer account ------------------------------------------------
  // Two records share the /account prefix on purpose: the signed-in section
  // sits under AccountLayout, while the authentication screens sit under
  // AuthLayout so its cinematic panel survives sign-in ↔ sign-up navigation.
  // Admin sign-in is not reachable from here — it lives in the separate admin
  // app, on its own origin and its own session.
  {
    path: '/account',
    component: () => import('@/layouts/AccountLayout.vue'),
    meta: { headerTheme: 'light', requiresAuth: true },
    children: [
      { path: '', name: 'account', component: () => import('@/pages/account/AccountOverview.vue') },
      {
        path: 'orders',
        name: 'account-orders',
        component: () => import('@/pages/account/AccountOrders.vue'),
      },
      {
        path: 'saved',
        name: 'account-saved',
        component: () => import('@/pages/account/AccountSaved.vue'),
      },
      {
        path: 'settings',
        name: 'account-settings',
        component: () => import('@/pages/account/AccountSettings.vue'),
      },
    ],
  },
  {
    path: '/account',
    component: () => import('@/layouts/AuthLayout.vue'),
    // `transitionKey` holds the outer page transition still while the routes
    // below swap, so only the form column animates.
    meta: { headerTheme: 'light', hideFooter: true, transitionKey: 'auth' },
    children: [
      {
        path: 'login',
        name: 'account-login',
        component: () => import('@/pages/account/SignIn.vue'),
        meta: { requiresGuest: true },
      },
      {
        path: 'register',
        name: 'account-register',
        component: () => import('@/pages/account/SignUp.vue'),
        meta: { requiresGuest: true },
      },
      {
        path: 'forgot-password',
        name: 'account-forgot-password',
        component: () => import('@/pages/account/ForgotPassword.vue'),
        meta: { requiresGuest: true },
      },
      {
        path: 'reset-password',
        name: 'account-reset-password',
        component: () => import('@/pages/account/ResetPassword.vue'),
      },
      {
        path: 'verify-email',
        name: 'account-verify-email',
        component: () => import('@/pages/account/VerifyEmail.vue'),
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/pages/NotFound.vue'),
    meta: { headerTheme: 'light' },
  },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    // A coordinate handed back to the router is not enough here: Lenis owns the
    // scroll position, keeps its own target, and would animate back down to the
    // old offset on the next wheel event — and it drops programmatic scrolls
    // outright while an overlay has it stopped. resetScroll() puts the native
    // scroller and Lenis back at the top together; `false` tells the router the
    // position is already handled.
    resetScroll();
    return false;
  },
});

// `scrollRestoration` is a property of the individual history entry, not of the
// session. vue-router sets it to 'manual' once, when the router is created, so
// every entry pushed after that is back to the browser default — and a Back
// into one of those had the browser re-applying that entry's old offset on top
// of the reset above, landing the reader halfway down a page they just opened.
// Re-asserting it as each entry becomes current is what actually holds.
router.afterEach(() => {
  if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';
});

router.beforeEach(async (to: RouteLocationNormalized) => {
  const needsAuth = to.matched.some((record) => record.meta.requiresAuth);
  const guestOnly = to.matched.some((record) => record.meta.requiresGuest);
  if (!needsAuth && !guestOnly) return true;

  const account = useAccountStore();
  // A page reload arrives with a token in storage but no user yet; resolve it
  // once before deciding, so a signed-in customer is never bounced to sign-in.
  if (!account.isReady) await account.restoreSession();

  if (needsAuth && !account.isAuthenticated) {
    return { name: 'account-login', query: { redirect: to.fullPath } };
  }
  if (guestOnly && account.isAuthenticated) {
    return { name: 'account' };
  }
  return true;
});

router.afterEach((to: RouteLocationNormalized) => {
  // One pageview per settled navigation. `afterEach` rather than a watcher, so
  // a redirect (/watches/:slug -> /products/:slug) is counted once, at the
  // destination, instead of twice.
  trackPageview(to.path);

  // Pages built from a single API record (product, brand, collection) own
  // their metadata and apply it once the record has loaded; everything else is
  // described entirely by the shared static record, keyed by route name.
  // Canonical is always the bare path — filter and sort queries never mint a
  // second indexable URL.
  const seo = staticSeo(String(to.name ?? ''), site);
  if (!seo) return;

  applySeo({ ...seo, canonical: to.path === '/' ? '/' : to.path });
  applyJsonLd(to.name === 'home' ? siteJsonLd() : []);
});

export default router;
