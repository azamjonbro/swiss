import { defineConfig, loadEnv, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

import { readSiteEnv } from './scripts/site-env.mjs'

/**
 * Refuses to produce a production bundle whose canonical origin is missing or
 * still points at localhost or a preview host.
 *
 * Canonical tags, Open Graph URLs, JSON-LD @ids and the prerendered HTML are
 * all derived from `VITE_SITE_URL`. A silent fallback there is invisible in
 * review and only shows up as a wrong domain in the index, so the build stops
 * instead. `vite dev` is left alone.
 */
function siteEnvGuard(): Plugin {
  return {
    name: 'sw-site-env-guard',
    apply: 'build',
    configResolved(config) {
      const env = loadEnv(config.mode, config.root, '')
      const { site } = readSiteEnv(env, { strict: config.mode === 'production' })
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
