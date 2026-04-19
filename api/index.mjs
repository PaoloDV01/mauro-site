/**
 * api/index.mjs — Vercel serverless entry point
 *
 * Esporta l'app Express come handler serverless.
 * Vercel lo invoca per tutte le route configurate in vercel.json.
 * In locale NON viene usato — si usa server.mjs direttamente.
 */

import app from '../server.mjs';

export default app;