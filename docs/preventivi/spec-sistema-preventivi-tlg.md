# Sistema automatico preventivi TLG

## Obiettivo
Calcolare un pre-preventivo realistico e inviarlo prima a Trasporti Leonardo Group per approvazione, modifica o rifiuto. Solo dopo l'approvazione, il cliente riceve l'offerta finale.

## Strategia consigliata
Non mostrare subito al cliente un preventivo finale vincolante per tutte le richieste.

### Fase 1 — consigliata subito
- Il cliente compila il form.
- Il backend calcola un prezzo suggerito.
- Il sistema invia una mail interna a Mauro con:
  - riepilogo spedizione
  - costo stimato
  - margine stimato
  - flag di rischio
  - pulsanti: Approva / Modifica / Respinge
- Il cliente riceve solo una conferma di presa in carico.

### Fase 2 — dopo 50-100 casi reali
- Solo per spedizioni standard si può mostrare al cliente una stima preliminare.
- Il prezzo finale continua comunque a passare da approvazione interna.

## Regole di pricing
Prezzo finale suggerito = max(
- minimo viaggio,
- prezzo necessario per il margine target,
- prezzo necessario per il margine minimo in euro
)
poi arrotondato al multiplo superiore configurato.

Componenti:
1. costo base vettore per km
2. pedaggio medio per km
3. extra (urgenza, frigo, ADR, tail lift, weekend, extra stop, attese, assicurazione)
4. buffer sourcing vettore
5. overhead operativo
6. buffer rischio incasso
7. margine target

## Casi da mandare sempre in review manuale
- ADR
- isole / estero / zone speciali
- ritiro in meno di 24h
- distanza oltre soglia
- fuori sagoma / troppo peso / troppi pallet
- multi-stop complesso
- merce ad alto valore
- finestre orarie troppo rigide

## Architettura tecnica consigliata
- Frontend: sito statico o Next.js
- Backend: API serverless
- Database: Supabase/Postgres
- Email: Resend o SMTP
- Routing km: OpenRouteService o Google Maps
- PDF: generazione server-side

## Endpoint minimi
- `POST /api/quotes/request`
- `POST /api/quotes/:id/approve`
- `POST /api/quotes/:id/reject`
- `POST /api/quotes/:id/update`
- `GET /admin/quotes/:id`

## Dati minimi del form
- ritiro
- consegna
- km
- pallet
- peso totale
- metri lineari
- valore merce
- ADR si/no
- temperatura controllata si/no
- tail lift si/no
- urgenza
- note operative

## KPI da tracciare
- richieste ricevute
- preventivi approvati
- preventivi modificati
- differenza tra prezzo automatico e prezzo finale
- conversion rate per tratta
- margine medio per tipologia di servizio
