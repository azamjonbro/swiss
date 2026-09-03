import { createRouter, createWebHistory, type RouteLocationNormalized } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/pages/admin/AdminLogin.vue'),
    meta: { public: true, title: 'Sign In — SwissWatch Admin' },
  },
  {
    path: '/',
    component: () => import('@/layouts/AdminLayout.vue'),
    meta: { requiresAuth: true, title: 'SwissWatch Admin' },
    children: [
      // `titleKey` names the screen in the header bar; it is an i18n key, not a
      // literal, so the header follows the admin's chosen language.
      {
        path: '',
        name: 'dashboard',
        component: () => import('@/pages/admin/AdminDashboard.vue'),
        meta: { titleKey: 'admin.dashboard' },
      },
      {
        path: 'analytics',
        name: 'analytics',
        component: () => import('@/pages/admin/AdminAnalytics.vue'),
        meta: { titleKey: 'admin.analytics' },
      },
      {
        path: 'watches',
        name: 'watches',
        component: () => import('@/pages/admin/AdminWatches.vue'),
        meta: { titleKey: 'admin.watches' },
      },
      {
        path: 'watches/new',
        name: 'watch-new',
        component: () => import('@/pages/admin/AdminWatchForm.vue'),
        meta: { titleKey: 'admin.newWatch' },
      },
      {
        path: 'watches/:id',
        name: 'watch-edit',
        component: () => import('@/pages/admin/AdminWatchForm.vue'),
        meta: { titleKey: 'admin.editWatch' },
      },
      {
        path: 'categories',
        name: 'categories',
        component: () => import('@/pages/admin/AdminCategories.vue'),
        meta: { titleKey: 'admin.categories' },
      },
      {
        path: 'brands',
        name: 'brands',
        component: () => import('@/pages/admin/AdminBrands.vue'),
        meta: { titleKey: 'admin.brands' },
      },
      {
        path: 'collections',
        name: 'collections',
        component: () => import('@/pages/admin/AdminCollections.vue'),
        meta: { titleKey: 'admin.collections' },
      },
      {
        path: 'inquiries',
        name: 'inquiries',
        component: () => import('@/pages/admin/AdminInquiries.vue'),
        meta: { titleKey: 'admin.inquiries' },
      },
      {
        path: 'media',
        name: 'media',
        component: () => import('@/pages/admin/AdminMedia.vue'),
        meta: { titleKey: 'admin.media' },
      },
      {
        path: 'settings',
        name: 'settings',
        component: () => import('@/pages/admin/AdminSettings.vue'),
        meta: { titleKey: 'admin.settings' },
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 };
  },
});

// Pages are lazy chunks whose filenames carry a content hash. A tab left open
// across a deploy still holds the old entry bundle, so its imports point at
// chunks the server no longer has: the navigation rejects and the link appears
// to do nothing. Reload once onto the current build instead of failing silently.
const RELOAD_FLAG = 'sw_admin_chunk_reload';

router.onError((error, to) => {
  const message = error instanceof Error ? error.message : String(error);
  const isChunkError = /dynamically imported module|Importing a module script failed|Failed to fetch/i.test(message);
  if (!isChunkError) return;

  // One attempt only — if the reload does not fix it, let the error surface
  // rather than trapping the admin in a refresh loop.
  if (sessionStorage.getItem(RELOAD_FLAG)) return;
  sessionStorage.setItem(RELOAD_FLAG, '1');
  window.location.assign(to.fullPath);
});

router.afterEach((to: RouteLocationNormalized) => {
  sessionStorage.removeItem(RELOAD_FLAG);
  const title = to.meta.title as string | undefined;
  if (title) document.title = title;
});

router.beforeEach(async (to: RouteLocationNormalized) => {
  if (!to.meta.requiresAuth) return true;

  const auth = useAuthStore();
  if (!auth.isReady) await auth.restoreSession();

  if (!auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } };
  }
  return true;
});

export default router;
