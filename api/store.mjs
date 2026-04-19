/**
 * api/store.mjs — Astrazione storage preventivi
 *
 * In produzione (Vercel): usa Upstash Redis.
 * In locale (node server.mjs): usa data/quotes.json come flat-file.
 */

import fs   from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname  = path.dirname(fileURLToPath(import.meta.url));
const QUOTES_FILE = path.join(__dirname, '..', 'data', 'quotes.json');
const USE_REDIS = !!(process.env.UPSTASH_REDIS_REST_URL || process.env.VERCEL);

let _redis = null;
async function getRedis() {
  if (!_redis) {
    const { Redis } = await import('@upstash/redis');
    _redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
  return _redis;
}

export async function loadQuotes() {
  if (USE_REDIS) {
    const redis = await getRedis();
    return (await redis.get('quotes')) || [];
  }
  try {
    const raw = await fs.readFile(QUOTES_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function saveQuotes(quotes) {
  if (USE_REDIS) {
    const redis = await getRedis();
    await redis.set('quotes', quotes);
  } else {
    await fs.writeFile(QUOTES_FILE, JSON.stringify(quotes, null, 2), 'utf-8');
  }
}