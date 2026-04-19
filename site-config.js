/**
 * site-config.js — Trasporti Leonardo Group
 *
 * Centralizza tutti i dati modificabili del sito.
 * Per aggiornare i placeholder prima del lancio, modifica solo questo file.
 *
 * PLACEHOLDERS DA SOSTITUIRE:
 *   TEL      → numero aziendale definitivo (es. +39 333 0000000)
 *   EMAIL    → email aziendale @dominio
 *   INDIRIZZO → sede operativa completa
 *   PIVA     → Partita IVA (aggiungere dopo costituzione)
 *   DOMINIO  → dominio definitivo (es. trasportileonardogroup.it)
 */

window.SITE = {
  brand:    'Trasporti Leonardo Group',
  tagline:  'Trasporti professionali. Sempre.',
  tel:      '+39 340 685 0138',
  telHref:  'tel:+393406850138',
  email:    'paolodv01@gmail.com',
  address:  '[INDIRIZZO]',
  piva:     '[P.IVA]',
  year:     '2026',

  services: [
    { name: 'Trasporto Frigorifero', url: '/servizi/trasporto-frigorifero/' },
    { name: 'Trasporto Pallet',      url: '/servizi/trasporto-pallet/'      },
    { name: 'Trasporto Misto',       url: '/servizi/trasporto-misto/'       },
  ],

  routes: [
    { from: 'Milano',  to: 'Pescara'                  },
    { from: 'Milano',  to: 'Roma'                     },
    { from: 'Milano',  to: 'Firenze'                  },
    { from: 'Pescara', to: 'Rimini'                   },
    { from: 'Pescara', to: 'Bologna'                  },
    { from: 'Pescara', to: 'San Benedetto del Tronto' },
  ],

  regions: [
    'Lombardia', 'Abruzzo', 'Marche',
    'Lazio', 'Toscana', 'Umbria', 'Emilia-Romagna',
  ],
};

// Inject phone links and brand references marked as [TEL] / [EMAIL] in HTML
// (fallback for any element with data-site-tel or data-site-email)
document.addEventListener('DOMContentLoaded', function () {
  // Update text + href when data-site-tel is on the <a> itself
  document.querySelectorAll('[data-site-tel]').forEach(function (el) {
    el.textContent = window.SITE.tel;
    if (el.tagName === 'A') el.href = window.SITE.telHref;
  });
  // Update only href when data-tel-href is on a wrapping <a> (text has prefix like "Chiamaci — ")
  document.querySelectorAll('a[data-tel-href]').forEach(function (el) {
    el.href = window.SITE.telHref;
  });
  document.querySelectorAll('[data-site-email]').forEach(function (el) {
    el.textContent = window.SITE.email;
    if (el.tagName === 'A') el.href = 'mailto:' + window.SITE.email;
  });
  document.querySelectorAll('a[data-email-href]').forEach(function (el) {
    el.href = 'mailto:' + window.SITE.email;
  });
  document.querySelectorAll('[data-site-address]').forEach(function (el) {
    el.textContent = window.SITE.address;
  });
  document.querySelectorAll('[data-site-piva]').forEach(function (el) {
    el.textContent = 'P.IVA ' + window.SITE.piva;
  });
});
