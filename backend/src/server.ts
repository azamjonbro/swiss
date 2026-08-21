import app from './app';
import { connectDatabase } from './config/db';
import { env } from './config/env';

async function main() {
  await connectDatabase();
  app.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`[server] SwissWatch API listening on http://localhost:${env.port}`);
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[server] failed to start', err);
  process.exit(1);
});
