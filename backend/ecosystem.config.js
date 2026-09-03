module.exports = {
  apps: [
    {
      name: 'swiss-backend',
      script: 'dist/server.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
      },
      /**
       * Headroom for the image pipeline, not a target.
       *
       * At 300M pm2 was restarting this process every few seconds: sharp's
       * working set alone reached 345 MB while serving a catalogue page, and
       * every restart dropped the requests in flight. sharp's cache is now
       * bounded (see middleware/resizeImages.ts), and this ceiling gives the
       * rest of the app room above that bound instead of sitting under it.
       *
       * The box has ~11 GB with under 1 GB in use across all eight pm2 apps,
       * and this is the only one that carries a cap at all.
       */
      max_memory_restart: '512M',
    },
  ],
};
