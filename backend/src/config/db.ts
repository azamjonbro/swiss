import mongoose from 'mongoose';
import { env } from './env';

/**
 * The connection string with its credentials stripped out.
 *
 * The startup line used to print `env.mongoUri` verbatim, which put the database
 * password into the pm2 log — and from there into anything that quotes the log.
 * Host and database name are what the line is actually for.
 */
function safeUri(uri: string): string {
  try {
    const parsed = new URL(uri);
    parsed.username = '';
    parsed.password = '';
    return parsed.toString();
  } catch {
    // Not a parseable URL — redact anything between "//" and "@" rather than guess.
    return uri.replace(/\/\/[^@/]*@/, '//');
  }
}

export async function connectDatabase(): Promise<void> {
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.mongoUri);
  // eslint-disable-next-line no-console
  console.log(`[db] connected -> ${safeUri(env.mongoUri)}`);
}
