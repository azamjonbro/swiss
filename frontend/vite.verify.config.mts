import { defineConfig, mergeConfig } from 'vite';
import base from './vite.config.ts';
const target = 'https://swiss.sds-max.uz';
export default mergeConfig(base, defineConfig({
  root: '/Users/mac/Desktop/swisswatch/frontend',
  server: {
    port: 5180,
    strictPort: true,
    proxy: {
      '/api': { target, changeOrigin: true, secure: true },
      '/uploads': { target, changeOrigin: true, secure: true },
    },
  },
}));
