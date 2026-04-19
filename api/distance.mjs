/**
 * api/distance.mjs — Distance calculator
 *
 * Phase 1: stub using known TLG operational routes.
 * Interface is designed to be swapped for OpenRouteService/Google Maps
 * in Phase 2 without changing callers.
 *
 * Return shape:
 *   { km: number, source: string, reliable: boolean, needs_review?: boolean }
 */

import fs   from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname   = path.dirname(fileURLToPath(import.meta.url));
const RATE_CARDS  = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'data', 'pricing', 'rate-cards.json'), 'utf-8')
);

/* Build a normalised lookup map from known_routes once at startup */
const ROUTE_MAP = new Map();

for (const r of RATE_CARDS.known_routes) {
  const a = normalise(r.from);
  const b = normalise(r.to);
  ROUTE_MAP.set(`${a}|${b}`, r.km);
  ROUTE_MAP.set(`${b}|${a}`, r.km); // bidirectional
}

/* ── Helpers ───────────────────────────────────────────────────── */

function normalise(str) {
  return (str || '')
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // strip accents
    .replace(/[^a-z0-9\s]/g, ' ')      // remove punctuation
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract the most likely city name from a free-text address.
 * Heuristic: take the last non-numeric, non-CAP token, or the first
 * recognisable city token against known_routes.
 */
function extractCity(address) {
  const norm = normalise(address);
  const tokens = norm.split(' ').filter(t => t.length > 2 && !/^\d+$/.test(t));

  // Try to match any token against known route endpoints
  const knownCities = new Set();
  for (const r of RATE_CARDS.known_routes) {
    knownCities.add(normalise(r.from));
    knownCities.add(normalise(r.to));
  }

  for (const token of tokens) {
    if (knownCities.has(token)) return token;
  }

  // Fallback: return the whole normalised string (may still match partially)
  return norm;
}

/* ── Public API ────────────────────────────────────────────────── */

/**
 * getDistanceKm(from, to)
 *
 * @param {string} from  — pickup address / city (free text)
 * @param {string} to    — delivery address / city (free text)
 * @returns {{ km: number|null, source: string, reliable: boolean, needs_review: boolean }}
 */
export function getDistanceKm(from, to) {
  const cityA = extractCity(from);
  const cityB = extractCity(to);

  const key1 = `${cityA}|${cityB}`;
  const key2 = `${cityB}|${cityA}`;

  if (ROUTE_MAP.has(key1)) {
    return { km: ROUTE_MAP.get(key1), source: 'known_route', reliable: true, needs_review: false };
  }
  if (ROUTE_MAP.has(key2)) {
    return { km: ROUTE_MAP.get(key2), source: 'known_route', reliable: true, needs_review: false };
  }

  // Unknown route — pricing engine will flag for manual review
  return {
    km:           null,
    source:       'unknown',
    reliable:     false,
    needs_review: true,
    reason:       `Tratta non riconosciuta: "${from}" → "${to}". Richiede verifica manuale km.`,
  };
}
