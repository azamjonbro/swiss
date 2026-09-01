/**
 * Types for `schema.mjs`. The implementation is plain ESM so the Node
 * prerenderer can run it directly; these declarations give the app the same
 * safety it gets from the rest of `src/`.
 */
import type { Brand, Collection, Watch } from '@/types/models';
import type { StoreLocation } from '@/data/locations';

export interface SeoSite {
  /** Production origin, no trailing slash — e.g. `https://swisswatchpremium.uz`. */
  url: string;
  name: string;
  /** Published contact address. Absent when the business has not published one. */
  contactEmail?: string;
  /** Published telephone number, in display form. Absent when unpublished. */
  contactPhone?: string;
  /** Path or absolute URL used when a page has no image of its own. */
  defaultImage?: string;
  /** Pixel size of `defaultImage`, declared to crawlers as `og:image:width/height`. */
  defaultImageWidth?: number;
  defaultImageHeight?: number;
  logo?: string;
  locale?: string;
  /** Active language code (`uz` | `ru` | `en`) — drives `og:locale`. */
  lang?: string;
  sameAs?: string[];
}

export interface PageSeo {
  title: string;
  description: string;
  /** Canonical path (or absolute URL) for this page. */
  canonical: string;
  image?: string;
  images?: string[];
  imageAlt?: string;
  type?: string;
  robots?: string;
  heading?: string;
  /** Language this page is rendered in; overrides `site.lang` for one page. */
  lang?: string;
}

export interface HeadMeta {
  name?: string;
  property?: string;
  content: string;
}

export interface HeadTags {
  title: string;
  canonical: string;
  metas: HeadMeta[];
}

export interface CrumbItem {
  name: string;
  path: string;
}

export type JsonLdNode = Record<string, unknown>;

export const PRODUCT_BASE: string;
export const STORES_PATH: string;
export const SITE_NAME: string;
export const DEFAULT_SITE_URL: string;
export const PRODUCTION_HOST: string;
export const TITLE_MAX: number;
export const DEFAULT_LANG: string;
export const OG_LOCALES: Record<string, string>;
export function ogLocale(lang?: string | null): string;
export function tidyDescription(text?: string | null): string;

export interface SiteInput {
  url?: string;
  name?: string;
  contactEmail?: string;
  contactPhone?: string;
}

export function resolveSiteUrl(
  raw: string | null | undefined,
  options?: { strict?: boolean; label?: string },
): string;
export function createSite(input?: SiteInput): SeoSite;
export function telHref(phone?: string | null): string;
export function clampTitleSegment(text: string | null | undefined, max: number): string;
export function usableLocations(locations: readonly StoreLocation[] | null | undefined): StoreLocation[];
export function storeSchemas(
  locations: readonly StoreLocation[] | null | undefined,
  site: SeoSite,
): JsonLdNode[];
export function formatStoreAddress(location: Partial<StoreLocation> | null | undefined): string;

export function productPath(slug: string): string;
export function brandPath(slug: string): string;
export function collectionPath(slug: string): string;
export function absoluteUrl(site: SeoSite, pathOrUrl?: string | null): string;
export function pageTitle(headline: string, site: SeoSite): string;
export function clampText(text?: string | null, max?: number): string;
export function brandNameOf(watch: Partial<Watch> | null | undefined): string;
export function brandSlugOf(watch: Partial<Watch> | null | undefined): string;
export function watchImages(watch: Partial<Watch> | null | undefined): string[];
export function watchFullName(watch: Partial<Watch> | null | undefined): string;
export function watchImageAlt(watch: Partial<Watch> | null | undefined, index?: number): string;
export function availabilityUrl(availability?: string): string;
export function watchSeo(watch: Watch, site: SeoSite): PageSeo;
export function brandSeo(brand: Brand, site: SeoSite): PageSeo;
export function collectionSeo(collection: Collection, site: SeoSite): PageSeo;
export function staticSeo(key: string, site: SeoSite): PageSeo | undefined;
export function headTags(seo: PageSeo, site: SeoSite): HeadTags;
export function organizationSchema(site: SeoSite): JsonLdNode;
export function websiteSchema(site: SeoSite): JsonLdNode;
export function breadcrumbSchema(items: CrumbItem[], site: SeoSite): JsonLdNode;
export function itemListSchema(items: CrumbItem[], site: SeoSite, name?: string): JsonLdNode;
export function productSchema(watch: Watch, site: SeoSite): JsonLdNode;
export function jsonLdGraph(nodes: (JsonLdNode | null | undefined)[]): string;
