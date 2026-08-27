/**
 * Types for `site-env.mjs`. Self-contained on purpose: `tsconfig.node.json`
 * type-checks `vite.config.ts` without the `@/*` path alias, so these
 * declarations must not reach into `src/`.
 */
export interface BuildSite {
  url: string;
  name: string;
  contactEmail?: string;
  contactPhone?: string;
  defaultImage?: string;
  logo?: string;
  locale?: string;
  sameAs?: string[];
}

export interface SiteEnv {
  url: string;
  site: BuildSite;
  apiUrl: string;
}

export function loadEnvFiles(root: string, mode?: string): Record<string, string>;
export function readSiteEnv(
  env: Record<string, string | undefined>,
  options?: { strict?: boolean },
): SiteEnv;
