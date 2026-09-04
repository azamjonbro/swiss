import app from './app';
import { connectDatabase } from './config/db';
import { env } from './config/env';
import { warnIfDisabled } from './services/turnstile';

async function main() {
  await connectDatabase();
  warnIfDisabled();
  /**
   * The interface to bind, not just the port.
   *
   * In production this API sits behind a reverse proxy on the same machine and
   * is bound to 127.0.0.1 so nothing outside the box can reach it directly.
   * That was a hand-edit living only on the server, which meant it was absent
   * from every fresh checkout and, worse, it blocked `git pull` the moment a
   * commit touched this file — the deploy aborted and quietly kept running old
   * code. Configuration belongs in the repository, driven by an env var.
   *
   * Unset falls back to 0.0.0.0, which is what `listen(port)` did before.
   */
  const host = process.env.HOST || '0.0.0.0';
  app.listen(env.port, host, () => {
    // eslint-disable-next-line no-console
    console.log(`[server] SwissWatch API listening on http://${host}:${env.port}`);
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[server] failed to start', err);
  process.exit(1);
});
