/**
 * api/quotes.mjs — Quote request router
 *
 * POST /api/quotes/request   — submit new quote request (public)
 *
 * Mounted at /api/quotes in server.mjs
 */

import { Router }     from 'express';
import { randomUUID } from 'node:crypto';
import { loadQuotes, saveQuotes } from './store.mjs';

import { getDistanceKm }  from './distance.mjs';
import { calculateQuote } from './pricing-engine.mjs';
import { sendInternalQuoteEmail } from './mailer.mjs';

const router = Router();

/* ── Input validation ─────────────────────────────────────────── */

function validateRequest(body) {
  const errors = [];

  if (!body.nome || body.nome.trim().length < 2)
    errors.push('nome: campo obbligatorio (min 2 caratteri)');

  if (!body.telefono || !/^[\d\s+\-().]{7,20}$/.test(body.telefono.trim()))
    errors.push('telefono: formato non valido');

  if (body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim()))
    errors.push('email: formato non valido');

  if (!body.partenza || body.partenza.trim().length < 3)
    errors.push('partenza: inserire un indirizzo di ritiro (min 3 caratteri)');

  if (!body.scarico || body.scarico.trim().length < 3)
    errors.push('scarico: inserire un indirizzo di consegna (min 3 caratteri)');

  if (!body.servizio || !['frigorifero', 'pallet', 'misto', 'altro'].includes(body.servizio))
    errors.push('servizio: selezionare un tipo di servizio valido');

  if (body.pallets !== undefined && body.pallets !== null && body.pallets !== '') {
    const n = parseInt(body.pallets, 10);
    if (isNaN(n) || n < 1 || n > 100)
      errors.push('pallets: valore non valido (1–100)');
  }

  if (body.peso_kg !== undefined && body.peso_kg !== null && body.peso_kg !== '') {
    const n = parseInt(body.peso_kg, 10);
    if (isNaN(n) || n < 1 || n > 50000)
      errors.push('peso_kg: valore non valido (1–50000 kg)');
  }

  return errors;
}

/* ── POST /api/quotes/request ─────────────────────────────────── */

router.post('/request', async (req, res) => {
  try {
    const errors = validateRequest(req.body);
    if (errors.length) {
      return res.status(422).json({ ok: false, errors });
    }

    const b   = req.body;
    const id  = randomUUID();
    const tok = randomUUID();   // admin action token — sent only via internal email
    const now = new Date().toISOString();

    /* Distance */
    const distance = getDistanceKm(b.partenza, b.scarico);

    /* Pricing */
    const pricing = calculateQuote({
      servizio:         b.servizio,
      distance,
      pallets:          b.pallets          ? parseInt(b.pallets, 10)          : null,
      peso_kg:          b.peso_kg          ? parseInt(b.peso_kg, 10)          : null,
      cargo_value_eur:  b.cargo_value_eur  ? parseFloat(b.cargo_value_eur)    : null,
      urgente:          b.urgente === true || b.urgente === 'true',
      tail_lift:        b.tail_lift === true || b.tail_lift === 'true',
      weekend_pickup:   b.weekend_pickup === true || b.weekend_pickup === 'true',
      adr:              b.servizio === 'misto',
      extra_stops:      b.extra_stops ? parseInt(b.extra_stops, 10) : 0,
    });

    /* Build quote record */
    const quote = {
      id,
      adminToken: tok,
      status:     'pending',          // pending | approved | rejected | modified
      createdAt:  now,
      updatedAt:  now,
      contact: {
        nome:     b.nome?.trim(),
        azienda:  b.azienda?.trim()  || null,
        telefono: b.telefono?.trim(),
        email:    b.email?.trim()    || null,
      },
      shipment: {
        partenza:       b.partenza?.trim(),
        scarico:        b.scarico?.trim(),
        servizio:       b.servizio,
        merce:          b.merce?.trim()          || null,
        pallets:        b.pallets                ? parseInt(b.pallets, 10)   : null,
        peso_kg:        b.peso_kg                ? parseInt(b.peso_kg, 10)   : null,
        cargo_value_eur:b.cargo_value_eur        ? parseFloat(b.cargo_value_eur) : null,
        urgente:        b.urgente === true || b.urgente === 'true',
        tail_lift:      b.tail_lift === true || b.tail_lift === 'true',
        weekend_pickup: b.weekend_pickup === true || b.weekend_pickup === 'true',
        extra_stops:    b.extra_stops ? parseInt(b.extra_stops, 10) : 0,
        note:           b.note?.trim()           || null,
      },
      distance,
      pricing,
      adminNote:    null,    // filled on modify/reject
      approvedPrice:null,    // filled on approve (may differ from suggested)
    };

    /* Persist */
    const quotes = await loadQuotes();
    quotes.push(quote);
    await saveQuotes(quotes);

    /* Internal email to Mauro */
    try {
      await sendInternalQuoteEmail(quote);
    } catch (mailErr) {
      // Email failure must NOT block the response to the client.
      // Log and continue — quote is already persisted.
      console.error('[quotes/request] email failed:', mailErr.message);
    }

    return res.json({
      ok:      true,
      message: 'Richiesta ricevuta. La contatteremo entro 24 ore lavorative.',
    });

  } catch (err) {
    console.error('[quotes/request] error:', err);
    return res.status(500).json({
      ok:     false,
      errors: ['Errore interno. Riprovare più tardi.'],
    });
  }
});

export default router;
