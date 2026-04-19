/**
 * api/mailer.mjs — Email sending via Nodemailer
 *
 * Config via environment variables:
 *   SMTP_HOST      — SMTP server hostname
 *   SMTP_PORT      — SMTP port (default 587)
 *   SMTP_USER      — SMTP username / sender address
 *   SMTP_PASS      — SMTP password / app password
 *   INTERNAL_EMAIL — Mauro's email address (receives new quote notifications)
 *   BASE_URL       — Site base URL for admin action links (default http://localhost:3000)
 *
 * Set these in a .env file (never commit to git) or in the server environment.
 * During development, set SMTP_HOST='' to skip sending and log to console instead.
 */

import nodemailer from 'nodemailer';
import fs         from 'node:fs/promises';
import path       from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/* ── Transport ────────────────────────────────────────────────── */

function createTransport() {
  const host = process.env.SMTP_HOST || '';

  if (!host) {
    // Dev mode: log to console, do not send
    return nodemailer.createTransport({ jsonTransport: true });
  }

  return nodemailer.createTransport({
    host,
    port:   parseInt(process.env.SMTP_PORT || '587', 10),
    secure: parseInt(process.env.SMTP_PORT || '587', 10) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

/* ── Template loader ──────────────────────────────────────────── */

async function loadTemplate(name) {
  const p = path.join(__dirname, '..', 'templates', name);
  return fs.readFile(p, 'utf-8');
}

function interpolate(template, vars) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const val = vars[key];
    return val != null ? String(val) : '';
  });
}

function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/* ── sendInternalQuoteEmail ───────────────────────────────────── */

export async function sendInternalQuoteEmail(quote) {
  const BASE_URL       = process.env.BASE_URL || 'http://localhost:3000';
  const INTERNAL_EMAIL = process.env.INTERNAL_EMAIL || '';
  const FROM_EMAIL     = process.env.SMTP_USER || 'noreply@trasportileonardogroup.it';

  if (!INTERNAL_EMAIL) {
    console.warn('[mailer] INTERNAL_EMAIL not set — skipping internal notification');
    return;
  }

  const tok = quote.adminToken;
  const sid = quote.id.slice(0, 8);
  const p   = quote.pricing;
  const s   = quote.shipment;
  const c   = quote.contact;
  const d   = quote.distance;

  const reviewAlert = p?.needs_review
    ? `<tr><td colspan="2" style="background:#fff3cd;padding:10px;border-radius:4px;">
         <strong>⚠️ Flag review:</strong> ${esc((p.review_reasons || []).join(', '))}
       </td></tr>`
    : '';

  const html = await loadTemplate('email-internal.html');

  const filled = interpolate(html, {
    quote_id:         sid,
    nome:             esc(c.nome),
    azienda:          c.azienda ? esc(c.azienda) : '—',
    telefono:         esc(c.telefono),
    email:            c.email   ? esc(c.email)   : '—',
    partenza:         esc(s.partenza),
    scarico:          esc(s.scarico),
    servizio:         esc(s.servizio),
    merce:            s.merce   ? esc(s.merce)   : '—',
    pallets:          s.pallets ?? '—',
    peso_kg:          s.peso_kg  ? s.peso_kg + ' kg' : '—',
    urgente:          s.urgente  ? 'Sì' : 'No',
    tail_lift:        s.tail_lift? 'Sì' : 'No',
    note:             s.note    ? esc(s.note)    : '—',
    km:               d.km      ? d.km + ' km'  : 'Non determinato',
    km_source:        d.source,
    km_reliable:      d.reliable ? 'Sì' : 'No — verifica manuale',
    suggested_price:  p?.suggested_price != null ? '€ ' + p.suggested_price : 'N/D',
    cost_total:       p?.breakdown?.cost_total   ? '€ ' + p.breakdown.cost_total : '—',
    margin:           p?.breakdown?.margin_on_target != null ? p.breakdown.margin_on_target + '%' : '—',
    review_alert:     reviewAlert,
    url_approve:      `${BASE_URL}/admin/quotes/${quote.id}?token=${tok}`,
    url_detail:       `${BASE_URL}/admin/quotes/${quote.id}?token=${tok}`,
    created_at:       new Date(quote.createdAt).toLocaleString('it-IT'),
  });

  const transport = createTransport();
  const info = await transport.sendMail({
    from:    `"TLG Preventivi" <${FROM_EMAIL}>`,
    to:      INTERNAL_EMAIL,
    subject: `[TLG] Nuova richiesta #${sid} — ${s.servizio} — ${s.partenza} → ${s.scarico}`,
    html:    filled,
  });

  if (process.env.SMTP_HOST === '') {
    console.log('[mailer/internal] (dev mode) email payload:', JSON.parse(info.message).subject);
  }
}

/* ── sendClientQuoteEmail ─────────────────────────────────────── */

export async function sendClientQuoteEmail(quote) {
  const FROM_EMAIL = process.env.SMTP_USER || 'noreply@trasportileonardogroup.it';

  if (!quote.contact.email) {
    console.warn('[mailer] client has no email — cannot send quote to', quote.contact.telefono);
    return;
  }

  const html = await loadTemplate('email-client.html');

  const filled = interpolate(html, {
    nome:           esc(quote.contact.nome),
    partenza:       esc(quote.shipment.partenza),
    scarico:        esc(quote.shipment.scarico),
    servizio:       esc(quote.shipment.servizio),
    final_price:    '€ ' + quote.approvedPrice,
    quote_id:       quote.id.slice(0, 8),
    note_admin:     quote.adminNote ? esc(quote.adminNote) : '',
  });

  const transport = createTransport();
  const info = await transport.sendMail({
    from:    `"Trasporti Leonardo Group" <${FROM_EMAIL}>`,
    to:      quote.contact.email,
    subject: `Preventivo Trasporti Leonardo Group — ${quote.shipment.partenza} → ${quote.shipment.scarico}`,
    html:    filled,
  });

  if (process.env.SMTP_HOST === '') {
    console.log('[mailer/client] (dev mode) would send to:', quote.contact.email);
    console.log('[mailer/client] subject:', JSON.parse(info.message).subject);
  }
}
