/**
 * server.mjs — TLG application server
 *
 * Replaces serve.mjs (static-only).
 * Serves static files AND mounts API routes.
 *
 * Run: node server.mjs
 * Dev: PORT=3000 node server.mjs
 */

import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import quotesRouter from './api/quotes.mjs';
import adminRouter  from './api/admin.mjs';

// In-memory rate limiter for quote submissions
const RATE_WINDOW_MS = 15 * 60 * 1000; // 15 min
const RATE_MAX       = 5;
const _rateStore     = new Map(); // ip → { count, windowStart }

function rateLimit(req, res, next) {
  const ip  = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  let entry = _rateStore.get(ip);

  if (!entry || now - entry.windowStart > RATE_WINDOW_MS) {
    entry = { count: 1, windowStart: now };
  } else {
    entry.count += 1;
  }
  _rateStore.set(ip, entry);

  if (entry.count > RATE_MAX) {
    return res.status(429).json({ ok: false, error: 'Troppe richieste. Riprova tra qualche minuto.' });
  }
  next();
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT      = parseInt(process.env.PORT || '3000', 10);

const app = express();

/* ── Security headers ─────────────────────────────────────────── */
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

/* ── Body parsing ─────────────────────────────────────────────── */
app.use(express.json({ limit: '32kb' }));
app.use(express.urlencoded({ extended: false, limit: '32kb' }));

/* ── Request logger (dev) ─────────────────────────────────────── */
app.use((req, _res, next) => {
  if (req.method !== 'GET') {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  }
  next();
});

/* ── API routes (mounted BEFORE static) ──────────────────────── */
app.post('/api/quotes/request', rateLimit);
app.use('/api/quotes', quotesRouter);
app.use('/admin',      adminRouter);

/* ── Block access to sensitive server-side paths ─────────────── */
app.use((req, res, next) => {
  const blocked = ['/api/', '/data/', '/templates/'];
  if (blocked.some(p => req.path.startsWith(p) && req.method === 'GET')) {
    // /api/* is already handled above; /data and /templates must not be browsable
    const isDataOrTemplates =
      req.path.startsWith('/data/') || req.path.startsWith('/templates/');
    if (isDataOrTemplates) {
      return res.status(403).send('Forbidden');
    }
  }
  next();
});

/* ── Static files ─────────────────────────────────────────────── */
app.use(express.static(__dirname, {
  index:    'index.html',
  dotfiles: 'deny',
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'no-store');
  },
}));

/* ── Clean-URL fallback: /contatti/ → contatti/index.html ──────  */
app.use((req, res) => {
  // Sanitize: strip path traversal attempts
  const safePath = req.path.replace(/\.\./g, '').replace(/\/+/g, '/');
  const candidate = path.join(__dirname, safePath, 'index.html');

  // Guard: must stay within project root
  if (!candidate.startsWith(__dirname + path.sep) &&
      candidate !== path.join(__dirname, 'index.html')) {
    return res.status(403).send('Forbidden');
  }

  res.sendFile(candidate, (err) => {
    if (err) res.status(404).send('404 Not Found: ' + req.path);
  });
});

/* ── Start ────────────────────────────────────────────────────── */
app.listen(PORT, '127.0.0.1', () => {
  console.log('');
  console.log('  TLG server  →  http://localhost:' + PORT);
  console.log('  Admin panel →  http://localhost:' + PORT + '/admin/quotes');
  console.log('');
});
