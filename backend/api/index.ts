import type { VercelRequest, VercelResponse } from '@vercel/node';
import app from '../src/app';
import { connectDatabase } from '../src/config/db';

// Serverless functions are stateless between cold starts, so the DB
// connection is cached on the module scope and reused across invocations
// instead of reconnecting on every request.
let dbReady: Promise<void> | null = null;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!dbReady) dbReady = connectDatabase();
  await dbReady;
  return app(req, res);
}
