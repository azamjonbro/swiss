import { createRouter, createWebHistory, type RouteLocationNormalized } from 'vue-router';
import { setMetaTag, setCanonicalUrl } from '@/composables/useMeta';

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
