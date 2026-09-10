import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

import { readSiteEnv } from './scripts/site-env.mjs'

/**
 * Prints the identity the bundle was built with.
 *
 * This used to be a gate: canonical tags, Open Graph URLs, JSON-LD @ids and the
 * prerendered HTML were all derived from `VITE_SITE_URL`, and a silent fallback
 * there is invisible in review and only shows up as a wrong domain in the
 * index — so the build refused to run. The origin is now a constant in
 * `src/seo/schema.mjs`, which is the stronger version of the same guarantee:
 * there is no value left to be missing. The line stays because a build log
 * should still say which site it just built.
 */
function siteEnvGuard(): Plugin {
  return {
    name: 'sw-site-env-guard',
    apply: 'build',
    configResolved(config) {
      const { site } = readSiteEnv()
      config.logger.info(`  \x1b[32m➜\x1b[0m  site: ${site.url} (${site.name})`)
    },
  }
}

export default defineConfig({
  plugins: [vue(), siteEnvGuard()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      // Both the index and its sections (/sitemap-products-1.xml, …).
      '^/sitemap.*\\.xml$': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
})
