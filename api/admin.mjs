/**
 * api/admin.mjs — Admin action router
 *
 * GET  /admin/quotes             — list all quotes (latest first)
 * GET  /admin/quotes/:id         — show quote detail + action form
 * POST /admin/quotes/:id/approve — approve and send client email
 * POST /admin/quotes/:id/reject  — reject and optionally send client email
 * POST /admin/quotes/:id/update  — modify price + notes, then approve
 *
 * All write actions require ?token=<adminToken> matching the stored value.
 * Token is sent only in the internal email — never in any client-facing URL.
 *
 * Mounted at /admin in server.mjs
 */

import { Router } from 'express';
import fs         from 'node:fs/promises';
import path       from 'node:path';
import { fileURLToPath } from 'node:url';

import { sendInternalQuoteEmail } from './mailer.mjs';
import { sendClientQuoteEmail }   from './mailer.mjs';

const __dirname   = path.dirname(fileURLToPath(import.meta.url));
const QUOTES_FILE = path.join(__dirname, '..', 'data', 'quotes.json');

const router = Router();

/* ── DB helpers ───────────────────────────────────────────────── */

async function readQuotes() {
  try {
    return JSON.parse(await fs.readFile(QUOTES_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

async function writeQuotes(quotes) {
  await fs.writeFile(QUOTES_FILE, JSON.stringify(quotes, null, 2), 'utf-8');
}

async function findQuote(id) {
  const quotes = await readQuotes();
  return { quotes, quote: quotes.find(q => q.id === id) || null };
}

/* ── Token guard middleware ───────────────────────────────────── */

function requireToken(req, res, next) {
  const token = req.query.token || req.body?.token;
  if (!token || typeof token !== 'string' || token.length < 10) {
    return res.status(401).send('Token mancante o non valido.');
  }
  req._token = token;
  next();
}

function verifyToken(quote, token) {
  return quote.adminToken === token;
}

/* ── GET /admin/quotes — list ─────────────────────────────────── */

router.get('/quotes', async (_req, res) => {
  const quotes = await readQuotes();
  const sorted = [...quotes].sort((a, b) =>
    new Date(b.createdAt) - new Date(a.createdAt)
  );

  const rows = sorted.map(q => `
    <tr>
      <td>${new Date(q.createdAt).toLocaleString('it-IT')}</td>
      <td>${esc(q.contact.nome)}</td>
      <td>${esc(q.shipment.partenza)} → ${esc(q.shipment.scarico)}</td>
      <td>${esc(q.shipment.servizio)}</td>
      <td>${q.pricing?.suggested_price != null ? '€ ' + q.pricing.suggested_price : '—'}</td>
      <td><span class="status status-${q.status}">${q.status}</span></td>
      <td><a href="/admin/quotes/${q.id}?token=${q.adminToken}">Dettaglio →</a></td>
    </tr>`).join('');

  res.send(adminPage('Preventivi TLG', `
    <h1>Preventivi ricevuti</h1>
    <table>
      <thead><tr>
        <th>Data</th><th>Cliente</th><th>Tratta</th>
        <th>Servizio</th><th>Prezzo suggerito</th><th>Stato</th><th></th>
      </tr></thead>
      <tbody>${rows || '<tr><td colspan="7">Nessun preventivo ricevuto.</td></tr>'}</tbody>
    </table>
  `));
});

/* ── GET /admin/quotes/:id — detail ───────────────────────────── */

router.get('/quotes/:id', requireToken, async (req, res) => {
  const { quote } = await findQuote(req.params.id);
  if (!quote)                          return res.status(404).send('Preventivo non trovato.');
  if (!verifyToken(quote, req._token)) return res.status(403).send('Token non valido.');

  const tok = req._token;
  const p   = quote.pricing;
  const s   = quote.shipment;
  const c   = quote.contact;
  const d   = quote.distance;

  const isPending = quote.status === 'pending';

  res.send(adminPage(`Preventivo #${quote.id.slice(0, 8)}`, `
    <h1>Preventivo #${quote.id.slice(0, 8)}</h1>
    <p>Stato: <span class="status status-${quote.status}">${quote.status}</span>
       &nbsp; Ricevuto: ${new Date(quote.createdAt).toLocaleString('it-IT')}</p>

    <h2>Contatto</h2>
    <dl>
      <dt>Nome</dt><dd>${esc(c.nome)}</dd>
      ${c.azienda ? `<dt>Azienda</dt><dd>${esc(c.azienda)}</dd>` : ''}
      <dt>Telefono</dt><dd>${esc(c.telefono)}</dd>
      ${c.email ? `<dt>Email</dt><dd>${esc(c.email)}</dd>` : ''}
    </dl>

    <h2>Spedizione</h2>
    <dl>
      <dt>Partenza</dt><dd>${esc(s.partenza)}</dd>
      <dt>Scarico</dt><dd>${esc(s.scarico)}</dd>
      <dt>Servizio</dt><dd>${esc(s.servizio)}</dd>
      ${s.merce   ? `<dt>Merce</dt><dd>${esc(s.merce)}</dd>` : ''}
      ${s.pallets ? `<dt>Pallet</dt><dd>${s.pallets}</dd>` : ''}
      ${s.peso_kg ? `<dt>Peso</dt><dd>${s.peso_kg} kg</dd>` : ''}
      <dt>Urgente</dt><dd>${s.urgente ? 'Sì' : 'No'}</dd>
      <dt>Sponda idraulica</dt><dd>${s.tail_lift ? 'Sì' : 'No'}</dd>
      ${s.note ? `<dt>Note</dt><dd>${esc(s.note)}</dd>` : ''}
    </dl>

    <h2>Distanza</h2>
    <dl>
      <dt>Km stimati</dt><dd>${d.km != null ? d.km + ' km' : 'Non determinato'}</dd>
      <dt>Fonte</dt><dd>${d.source}</dd>
      <dt>Affidabile</dt><dd>${d.reliable ? 'Sì' : 'No — verifica manuale richiesta'}</dd>
    </dl>

    <h2>Pricing</h2>
    ${p?.ok === false ? `<p class="alert">⚠️ Pricing non disponibile — review manuale obbligatoria.</p>` : `
    <dl>
      <dt>Prezzo suggerito</dt><dd><strong>€ ${p.suggested_price}</strong></dd>
      <dt>Costo base</dt><dd>€ ${p.breakdown.cost_base}</dd>
      <dt>Extra</dt><dd>€ ${p.breakdown.cost_extras}</dd>
      <dt>Costo totale (con buffer)</dt><dd>€ ${p.breakdown.cost_total}</dd>
      <dt>Margine stimato</dt><dd>${p.breakdown.margin_on_target}%</dd>
    </dl>`}

    ${p?.needs_review ? `
    <div class="alert">
      <strong>⚠️ Flag di review:</strong><br>
      <ul>${(p.review_reasons || []).map(r => `<li>${esc(r)}</li>`).join('')}</ul>
    </div>` : ''}

    ${isPending ? `
    <h2>Azioni</h2>

    <form method="POST" action="/admin/quotes/${quote.id}/approve?token=${tok}" style="display:inline-block; margin-right:12px;">
      <label>Prezzo finale (€):<br>
        <input type="number" name="final_price" value="${p?.suggested_price || ''}"
               min="1" step="1" required style="width:120px;">
      </label><br><br>
      <button type="submit" class="btn btn-approve">✓ Approva e invia al cliente</button>
    </form>

    <form method="POST" action="/admin/quotes/${quote.id}/update?token=${tok}" style="display:inline-block; margin-right:12px;">
      <label>Nuovo prezzo (€):<br>
        <input type="number" name="final_price" value="${p?.suggested_price || ''}"
               min="1" step="1" required style="width:120px;">
      </label><br>
      <label>Nota interna:<br>
        <textarea name="admin_note" rows="2" style="width:300px;"></textarea>
      </label><br><br>
      <button type="submit" class="btn btn-update">✎ Modifica e approva</button>
    </form>

    <form method="POST" action="/admin/quotes/${quote.id}/reject?token=${tok}">
      <label>Motivo rifiuto (opzionale):<br>
        <textarea name="admin_note" rows="2" style="width:300px;"></textarea>
      </label><br><br>
      <button type="submit" class="btn btn-reject">✗ Respingi</button>
    </form>
    ` : `<p><em>Azione già eseguita in data ${new Date(quote.updatedAt).toLocaleString('it-IT')}.</em></p>`}

    <br><a href="/admin/quotes">← Torna all'elenco</a>
  `));
});

/* ── POST /admin/quotes/:id/approve ──────────────────────────── */

router.post('/quotes/:id/approve', requireToken, async (req, res) => {
  const { quotes, quote } = await findQuote(req.params.id);
  if (!quote)                          return res.status(404).send('Non trovato.');
  if (!verifyToken(quote, req._token)) return res.status(403).send('Token non valido.');
  if (quote.status !== 'pending')      return res.status(409).send('Già elaborato.');

  const finalPrice = parseFloat(req.body.final_price);
  if (!finalPrice || finalPrice < 1)   return res.status(422).send('Prezzo non valido.');

  quote.status        = 'approved';
  quote.approvedPrice = finalPrice;
  quote.updatedAt     = new Date().toISOString();

  await writeQuotes(quotes);

  /* Send client email */
  try {
    await sendClientQuoteEmail(quote);
  } catch (e) {
    console.error('[admin/approve] client email failed:', e.message);
    return res.send(adminPage('Approvato', `
      <h1>✓ Preventivo approvato</h1>
      <p>⚠️ Attenzione: email al cliente NON inviata per errore SMTP.</p>
      <p>Contatta manualmente: ${esc(quote.contact.email || quote.contact.telefono)}</p>
      <a href="/admin/quotes">← Torna all'elenco</a>
    `));
  }

  res.send(adminPage('Approvato', `
    <h1>✓ Preventivo approvato</h1>
    <p>Email inviata a: <strong>${esc(quote.contact.email)}</strong><br>
       Prezzo comunicato: <strong>€ ${finalPrice}</strong></p>
    <a href="/admin/quotes">← Torna all'elenco</a>
  `));
});

/* ── POST /admin/quotes/:id/update (modify + approve) ────────── */

router.post('/quotes/:id/update', requireToken, async (req, res) => {
  const { quotes, quote } = await findQuote(req.params.id);
  if (!quote)                          return res.status(404).send('Non trovato.');
  if (!verifyToken(quote, req._token)) return res.status(403).send('Token non valido.');
  if (quote.status !== 'pending')      return res.status(409).send('Già elaborato.');

  const finalPrice = parseFloat(req.body.final_price);
  if (!finalPrice || finalPrice < 1)   return res.status(422).send('Prezzo non valido.');

  quote.status        = 'modified';
  quote.approvedPrice = finalPrice;
  quote.adminNote     = req.body.admin_note?.trim() || null;
  quote.updatedAt     = new Date().toISOString();

  await writeQuotes(quotes);

  try {
    await sendClientQuoteEmail(quote);
  } catch (e) {
    console.error('[admin/update] client email failed:', e.message);
    return res.send(adminPage('Modificato', `
      <h1>✎ Preventivo modificato</h1>
      <p>⚠️ Email al cliente NON inviata per errore SMTP.</p>
      <p>Contatta manualmente: ${esc(quote.contact.email || quote.contact.telefono)}</p>
      <a href="/admin/quotes">← Torna all'elenco</a>
    `));
  }

  res.send(adminPage('Modificato', `
    <h1>✎ Preventivo modificato e approvato</h1>
    <p>Email inviata a: <strong>${esc(quote.contact.email)}</strong></p>
    <a href="/admin/quotes">← Torna all'elenco</a>
  `));
});

/* ── POST /admin/quotes/:id/reject ───────────────────────────── */

router.post('/quotes/:id/reject', requireToken, async (req, res) => {
  const { quotes, quote } = await findQuote(req.params.id);
  if (!quote)                          return res.status(404).send('Non trovato.');
  if (!verifyToken(quote, req._token)) return res.status(403).send('Token non valido.');
  if (quote.status !== 'pending')      return res.status(409).send('Già elaborato.');

  quote.status    = 'rejected';
  quote.adminNote = req.body.admin_note?.trim() || null;
  quote.updatedAt = new Date().toISOString();

  await writeQuotes(quotes);

  res.send(adminPage('Respinto', `
    <h1>✗ Preventivo respinto</h1>
    <p>Nessuna email inviata al cliente.</p>
    <a href="/admin/quotes">← Torna all'elenco</a>
  `));
});

/* ── Admin HTML shell ─────────────────────────────────────────── */

function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function adminPage(title, body) {
  return `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} — TLG Admin</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: system-ui, sans-serif; max-width: 900px; margin: 32px auto;
         padding: 0 24px; color: #1a1a1a; background: #f8f8f8; }
  h1 { font-size: 1.5rem; margin-bottom: 8px; }
  h2 { font-size: 1.1rem; margin-top: 28px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 8px;
          overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,.08); }
  th, td { padding: 10px 14px; text-align: left; border-bottom: 1px solid #eee; font-size: .9rem; }
  th { background: #f0f0f0; font-weight: 600; }
  dl { display: grid; grid-template-columns: 180px 1fr; gap: 6px 16px; background: #fff;
       padding: 16px; border-radius: 8px; box-shadow: 0 1px 4px rgba(0,0,0,.06); }
  dt { font-weight: 600; color: #555; font-size: .85rem; }
  dd { margin: 0; font-size: .9rem; }
  .status { display: inline-block; padding: 2px 8px; border-radius: 4px;
            font-size: .75rem; font-weight: 700; text-transform: uppercase; }
  .status-pending  { background: #fff3cd; color: #856404; }
  .status-approved { background: #d1e7dd; color: #0f5132; }
  .status-modified { background: #cfe2ff; color: #084298; }
  .status-rejected { background: #f8d7da; color: #842029; }
  .alert { background: #fff3cd; border: 1px solid #ffc107; border-radius: 6px;
           padding: 12px 16px; margin-top: 16px; }
  .btn { display: inline-block; padding: 10px 20px; border: none; border-radius: 6px;
         cursor: pointer; font-size: .9rem; font-weight: 600; }
  .btn-approve { background: #198754; color: #fff; }
  .btn-update  { background: #0d6efd; color: #fff; }
  .btn-reject  { background: #dc3545; color: #fff; }
  a { color: #0d6efd; }
  input, textarea { border: 1px solid #ccc; border-radius: 4px; padding: 6px 8px;
                    font-size: .9rem; margin-top: 4px; }
</style>
</head>
<body>
<nav style="margin-bottom:24px; font-size:.85rem;">
  <a href="/admin/quotes">← Tutti i preventivi</a>
</nav>
${body}
</body>
</html>`;
}

export default router;
