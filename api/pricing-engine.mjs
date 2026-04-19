/**
 * api/pricing-engine.mjs — Server-side pricing engine
 *
 * Formula (from spec-sistema-preventivi-tlg.md):
 *
 *   cost_base    = km × (vehicle_cost_per_km + toll_per_km) × service_rate_multiplier
 *   cost_extras  = sum of applicable extra supplements
 *   cost_gross   = cost_base + cost_extras
 *   cost_total   = cost_gross × (1 + sourcing_buffer_pct/100)
 *                             × (1 + overhead_pct/100)
 *                             × (1 + payment_risk_buffer_pct/100)
 *
 *   price_for_target_margin  = cost_total / (1 - target_pct/100)
 *   price_for_minimum_margin = cost_total / (1 - minimum_pct/100)
 *   price_minimum_eur_margin = cost_total + minimum_eur
 *
 *   suggested_price = max(
 *     trip_minimum,
 *     price_for_target_margin,
 *     price_for_minimum_margin,
 *     price_minimum_eur_margin
 *   ) rounded up to next step
 *
 * Never exposed to the browser. All config values come from data/pricing/.
 */

import fs   from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/* Load configs once at startup */
const assumptions = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'data', 'pricing', 'assumptions.json'), 'utf-8')
);
const rateCards = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'data', 'pricing', 'rate-cards.json'), 'utf-8')
);
const extrasConfig = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'data', 'pricing', 'extras.json'), 'utf-8')
);

/* ── Helpers ───────────────────────────────────────────────────── */

function ceilToStep(value, step) {
  return Math.ceil(value / step) * step;
}

function getServiceKey(servizio) {
  switch (servizio) {
    case 'frigorifero': return 'frigo';
    case 'misto':       return 'misto_adr';
    case 'pallet':
    default:            return 'standard';
  }
}

function getRateForDistance(serviceKey, km) {
  const service = rateCards.services[serviceKey];
  if (!service) return null;

  const band = service.distance_bands.find(b => km >= b.from_km && km <= b.to_km);
  return band ? band.rate_per_km : service.base_rate_per_km;
}

function detectReviewFlags(input, distanceResult) {
  const flags = [];
  const thr   = assumptions.review_thresholds;

  if (input.servizio === 'misto' || input.adr === true)
    flags.push('adr');

  if (!distanceResult.reliable || distanceResult.needs_review)
    flags.push('over_distance');

  if (distanceResult.km && distanceResult.km > thr.max_distance_km)
    flags.push('over_distance');

  if (input.pallets  && input.pallets  > thr.max_pallets)
    flags.push('over_payload');

  if (input.peso_kg  && input.peso_kg  > thr.max_weight_kg)
    flags.push('over_payload');

  if (input.cargo_value_eur && input.cargo_value_eur > thr.max_cargo_value_eur)
    flags.push('high_value_cargo');

  if (input.urgente === true)
    flags.push('express');

  if (input.extra_stops && input.extra_stops > 2)
    flags.push('complex_multistop');

  return flags;
}

/* ── Public API ────────────────────────────────────────────────── */

/**
 * calculateQuote(input)
 *
 * @param {object} input
 *   input.servizio         — 'frigorifero' | 'pallet' | 'misto' | 'altro'
 *   input.distance         — result from getDistanceKm()
 *   input.pallets          — number | null
 *   input.peso_kg          — number | null
 *   input.urgente          — boolean
 *   input.tail_lift        — boolean
 *   input.adr              — boolean
 *   input.weekend_pickup   — boolean
 *   input.extra_stops      — number (0+)
 *   input.cargo_value_eur  — number | null
 *
 * @returns {object} pricing result (never throws — returns needs_review:true on bad input)
 */
export function calculateQuote(input) {
  const reviewFlags = detectReviewFlags(input, input.distance || {});

  /* If we don't have reliable km, we cannot price — send to manual review */
  const km = input.distance?.km;
  if (!km || !input.distance?.reliable) {
    reviewFlags.push('over_distance');
    return {
      ok:             false,
      needs_review:   true,
      review_flags:   [...new Set(reviewFlags)],
      review_reasons: reviewFlags.map(f => extrasConfig.review_flags[f] || f),
      suggested_price: null,
      breakdown:       null,
    };
  }

  const serviceKey   = getServiceKey(input.servizio);
  const ratePerKm    = getRateForDistance(serviceKey, km);
  const a            = assumptions;

  /* 1 — Base transport cost */
  const cost_base = km * (a.vehicle_cost_per_km + a.toll_per_km) * ratePerKm;

  /* 2 — Extra supplements */
  let cost_extras = 0;
  const extras_applied = [];

  if (input.urgente) {
    const sup = extrasConfig.extras.urgency;
    const amt = cost_base * (sup.value / 100);
    cost_extras += amt;
    extras_applied.push({ key: 'urgency', label: sup.label, amount: amt });
  }

  if (input.tail_lift) {
    const sup = extrasConfig.extras.tail_lift;
    cost_extras += sup.value;
    extras_applied.push({ key: 'tail_lift', label: sup.label, amount: sup.value });
  }

  if (input.weekend_pickup) {
    const sup = extrasConfig.extras.weekend;
    cost_extras += sup.value;
    extras_applied.push({ key: 'weekend', label: sup.label, amount: sup.value });
  }

  if (input.extra_stops && input.extra_stops > 0) {
    const sup = extrasConfig.extras.extra_stop;
    const amt = sup.value * input.extra_stops;
    cost_extras += amt;
    extras_applied.push({ key: 'extra_stop', label: sup.label, amount: amt });
  }

  if (input.cargo_value_eur && input.cargo_value_eur > 0) {
    const sup = extrasConfig.extras.insurance;
    const amt = Math.max(sup.min_eur, input.cargo_value_eur * (sup.value / 100));
    cost_extras += amt;
    extras_applied.push({ key: 'insurance', label: sup.label, amount: amt });
  }

  /* ADR is a flag for review AND has a supplement */
  if (input.adr || input.servizio === 'misto') {
    const sup = extrasConfig.extras.adr;
    cost_extras += sup.value;
    extras_applied.push({ key: 'adr', label: sup.label, amount: sup.value });
  }

  /* 3 — Gross cost */
  const cost_gross = cost_base + cost_extras;

  /* 4 — Apply operational buffers (compounding) */
  const cost_total = cost_gross
    * (1 + a.sourcing_buffer_pct        / 100)
    * (1 + a.overhead_pct               / 100)
    * (1 + a.payment_risk_buffer_pct    / 100);

  /* 5 — Minimum price thresholds */
  const trip_min = serviceKey === 'frigo'
    ? a.minimums.frigo_trip_eur
    : a.minimums.trip_eur;

  /* 6 — Price candidates */
  const price_target  = cost_total / (1 - a.margins.target_pct  / 100);
  const price_min_pct = cost_total / (1 - a.margins.minimum_pct / 100);
  const price_min_eur = cost_total + a.margins.minimum_eur;

  const raw_price = Math.max(trip_min, price_target, price_min_pct, price_min_eur);

  /* 7 — Round up to configured step */
  const suggested_price = ceilToStep(raw_price, a.rounding.step);

  /* 8 — Check if any extras trigger mandatory review */
  for (const e of extras_applied) {
    const cfg = extrasConfig.extras[e.key];
    if (cfg?.triggers_review) reviewFlags.push(e.key);
  }

  const uniqueFlags = [...new Set(reviewFlags)];

  return {
    ok:             true,
    needs_review:   uniqueFlags.length > 0,
    review_flags:   uniqueFlags,
    review_reasons: uniqueFlags.map(f => extrasConfig.review_flags[f] || f),
    suggested_price,
    breakdown: {
      km,
      service:            serviceKey,
      rate_per_km:        ratePerKm,
      cost_base:          round2(cost_base),
      cost_extras:        round2(cost_extras),
      extras_applied,
      cost_gross:         round2(cost_gross),
      cost_total:         round2(cost_total),
      raw_price:          round2(raw_price),
      suggested_price,
      margin_on_target:   round2(((suggested_price - cost_total) / suggested_price) * 100),
    },
  };
}

function round2(n) { return Math.round(n * 100) / 100; }
