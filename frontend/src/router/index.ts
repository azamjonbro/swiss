import { createRouter, createWebHistory, type RouteLocationNormalized } from 'vue-router';
import { setMetaTag, setCanonicalUrl } from '@/composables/useMeta';
import { useAccountStore } from '@/stores/account';

const routes = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/pages/Home.vue'),
    meta: {
      headerTheme: 'transparent',
      title: 'SwissWatch — Time, Refined.',
      description: 'A digital luxury showroom for exceptional Swiss timepieces. Discover, inquire, acquire.',
    },
  },
  {
    path: '/watches',
    name: 'watches',
    component: () => import('@/pages/WatchList.vue'),
    meta: {
      headerTheme: 'light',
      title: 'Timepieces — SwissWatch',
      description: 'Browse our authenticated collection of fine Swiss timepieces from the world’s foremost maisons.',
    },
  },
  {
    path: '/watches/:slug',
    name: 'watch-detail',
    component: () => import('@/pages/WatchDetail.vue'),
    meta: { headerTheme: 'light', title: 'SwissWatch' },
  },
  {
    path: '/brands',
    name: 'brands',
    component: () => import('@/pages/BrandList.vue'),
    meta: {
      headerTheme: 'light',
      title: 'Brands — SwissWatch',
      description: 'The Swiss and international maisons represented in the SwissWatch collection.',
    },
  },
  {
    path: '/brands/:slug',
    name: 'brand-detail',
    component: () => import('@/pages/BrandDetail.vue'),
    meta: { headerTheme: 'light', title: 'SwissWatch' },
  },
  {
    path: '/collections',
    name: 'collections',
    component: () => import('@/pages/CollectionList.vue'),
    meta: {
      headerTheme: 'light',
      title: 'Collections — SwissWatch',
      description: 'Curated collections of fine timepieces, assembled by the SwissWatch team.',
    },
  },
  {
    path: '/collections/:slug',
    name: 'collection-detail',
    component: () => import('@/pages/CollectionDetail.vue'),
    meta: { headerTheme: 'light', title: 'SwissWatch' },
  },
  {
    path: '/about',
    name: 'about',
    component: () => import('@/pages/About.vue'),
    meta: {
      headerTheme: 'light',
      title: 'About — SwissWatch',
      description: 'SwissWatch is a curated showroom for authenticated luxury timepieces, built on trust.',
    },
  },
  {
    path: '/contact',
    name: 'contact',
    component: () => import('@/pages/Contact.vue'),
    meta: {
      headerTheme: 'light',
      title: 'Contact — SwissWatch',
      description: 'Speak with a SwissWatch specialist about acquisitions, consignments, or general inquiries.',
    },
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
    meta: { headerTheme: 'light', requiresAuth: true, title: 'Account — SwissWatch' },
    children: [
      { path: '', name: 'account', component: () => import('@/pages/account/AccountOverview.vue') },
      {
        path: 'orders',
        name: 'account-orders',
        component: () => import('@/pages/account/AccountOrders.vue'),
        meta: { title: 'Orders — SwissWatch' },
      },
      {
        path: 'saved',
        name: 'account-saved',
        component: () => import('@/pages/account/AccountSaved.vue'),
        meta: { title: 'Saved — SwissWatch' },
      },
      {
        path: 'settings',
        name: 'account-settings',
        component: () => import('@/pages/account/AccountSettings.vue'),
        meta: { title: 'Settings — SwissWatch' },
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
        meta: {
          requiresGuest: true,
          title: 'Sign In — SwissWatch',
          description: 'Sign in to your SwissWatch account to follow your acquisitions and saved timepieces.',
        },
      },
      {
        path: 'register',
        name: 'account-register',
        component: () => import('@/pages/account/SignUp.vue'),
        meta: {
          requiresGuest: true,
          title: 'Create Account — SwissWatch',
          description: 'Create a SwissWatch account to save timepieces and follow your acquisition requests.',
        },
      },
      {
        path: 'forgot-password',
        name: 'account-forgot-password',
        component: () => import('@/pages/account/ForgotPassword.vue'),
        meta: { requiresGuest: true, title: 'Reset Password — SwissWatch' },
      },
      {
        path: 'reset-password',
        name: 'account-reset-password',
        component: () => import('@/pages/account/ResetPassword.vue'),
        meta: { title: 'Reset Password — SwissWatch' },
      },
      {
        path: 'verify-email',
        name: 'account-verify-email',
        component: () => import('@/pages/account/VerifyEmail.vue'),
        meta: { title: 'Confirm Email — SwissWatch' },
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/pages/NotFound.vue'),
    meta: { headerTheme: 'light', title: 'Page Not Found — SwissWatch' },
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
  const title = to.meta.title as string | undefined;
  const description = to.meta.description as string | undefined;
  if (title) {
    document.title = title;
    setMetaTag('property', 'og:title', title);
  }
  if (description) {
    setMetaTag('name', 'description', description);
    setMetaTag('property', 'og:description', description);
  }
  setCanonicalUrl(to.path);
});

export default router;
