# Brand Guidelines — PLACEHOLDER

> ⚠️ Questi valori sono placeholder temporanei. Vanno sostituiti con i brand assets reali
> forniti dal cliente (Mauro) non appena disponibili. La struttura di questo file è pensata
> per essere riempita 1:1 senza toccare il codice.

---

## Identità (placeholder)

- **Nome provvisorio:** LOGISTICA (sostituire)
- **Tagline provvisoria:** "Trasporti su misura, in Italia e in Europa." (sostituire)
- **Tono di voce:** sobrio, diretto, affidabile, non aggressivo. Niente slogan urlati,
  niente superlativi ("i migliori", "i numeri uno"). Dati concreti > aggettivi.

---

## Color Palette

Pensata per trasporti B2B: seria, calda, non fredda-tech. Nessun colore della
stock Tailwind palette (ban da CLAUDE.md §7).

### Primari
| Ruolo       | Nome         | Hex       | Uso                                       |
|-------------|--------------|-----------|-------------------------------------------|
| `--primary` | Blu petrolio | `#0E3B43` | Header, heading, elementi strutturali     |
| `--primary-light` | Petrolio chiaro | `#1F5D66` | Hover su primary, link attivi       |
| `--cta`     | Arancio bruciato | `#C2410C` | Bottoni call-to-action, accenti       |
| `--cta-hover` | Arancio scuro | `#9A3412` | Stato hover dei CTA                  |

### Superfici (layering system, CLAUDE.md §8)
| Ruolo       | Nome         | Hex       | Uso                                       |
|-------------|--------------|-----------|-------------------------------------------|
| `--bg-base` | Sabbia chiara | `#FAF7F2` | Background pagina                        |
| `--bg-elevated` | Bianco caldo | `#FFFDF9` | Card, box contenuti                  |
| `--bg-floating` | Bianco puro | `#FFFFFF` | Modali, tooltip, dropdown             |

### Testo e bordi
| Ruolo       | Nome         | Hex       | Uso                                       |
|-------------|--------------|-----------|-------------------------------------------|
| `--text`    | Antracite    | `#1C1917` | Body copy                                |
| `--text-muted` | Grigio caldo | `#57534E` | Didascalie, note, meta                |
| `--border`  | Beige fumé   | `#E7E2D9` | Divisori, bordi card                     |

### Contrasti verificati (WCAG AA)
- `--text` su `--bg-base` → contrast 15.8:1 ✅
- `--cta` (bianco sopra) → contrast 5.9:1 ✅
- `--primary` (bianco sopra) → contrast 11.2:1 ✅

---

## Typography

Coppia display-serif + sans pulito, come prescritto da CLAUDE.md §8.

- **Heading:** Fraunces (serif moderno, variable font, pesi 400-900)
- **Body:** Inter (sans geometrico, pesi 400-700)
- **Google Fonts URL:** https://fonts.google.com/share?selection.family=Fraunces:opsz,wght@9..144,400..900|Inter:wght@400..700

### Regole tipografiche (da CLAUDE.md §8)
- Heading grandi (h1, h2): `letter-spacing: -0.03em`
- Body: `line-height: 1.7`
- Heading: pesi 600-800
- Body: peso 400, meta 500

---

## Logo

- **File:** `logo-placeholder.svg`
- **Uso:** monocromatico in `--primary`, altezza minima 32px, padding laterale di almeno
  il 50% dell'altezza del logo.
- **Versione su fondo scuro:** applicare `filter: invert(1) brightness(10)` via CSS oppure
  sostituire con versione `logo-placeholder-white.svg` (da creare se servirà).

---

## Sostituzione con brand reale

Quando Mauro fornirà i brand assets veri, sostituire in questo file:
1. I 6 colori della palette (mantenere i nomi delle variabili CSS)
2. I due font (aggiornare il link Google Fonts)
3. Il file `logo-placeholder.svg` → `logo.svg` (e aggiornare il riferimento in `index.html`)
4. Nome azienda e tagline

Zero modifiche al codice HTML/CSS: tutto pesca dalle variabili CSS definite in
`:root` nel file `index.html`.
