import { createRouter, createWebHistory, type RouteLocationNormalized } from 'vue-router';
import { applyJsonLd, applySeo, site, siteJsonLd } from '@/utils/seo';
import { staticSeo } from '@/seo/schema.mjs';
import { useAccountStore } from '@/stores/account';

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
    redirect: (to) => ({ name: 'product-detail', params: { slug: to.params.slug }, query: to.query }),
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
    return { top: 0 };
  },
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
