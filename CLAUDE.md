# CLAUDE.md — Project Constitution

This file is the source of truth for Claude Code on this project.
Read it fully at the start of every session. Do not deviate.

---

## 0. Always Do First

Before writing or reviewing **any** frontend code, **invoke the `frontend-design` skill**.
No exceptions. Design tokens, component patterns and anti-generic rules live there — load them fresh, do not assume.

---

## 1. Project Context

- **Client:** Mauro — Italian freight/logistics agency.
- **Scope:** Marketing website (vetrina) for lead generation. Traffic will come from Google Ads and social.
- **Stage:** Greenfield. No brand, no copy, no images yet.
- **Language of the site:** Italian (UI copy). Code, comments, commits: English.

---

## 2. Hybrid Workflow — Claude Code as Architect

Claude Code is the **ARCHITECT**. It does **not** write most of the code itself.
The actual implementation is done by **Cline + GLM 5.1** (50k context - small window, plan accordingly) acting as the **EXECUTOR**.
The human (Paolo) is the bridge: copies tasks from Claude Code → pastes into Cline → pastes results back.

### Implications for how Claude Code must work

1. **Plan, don't rush to code.** Start every feature by producing a short plan: goal, files touched, acceptance criteria.
2. **Write tasks to be copy-pasted into Cline.** Every task handed off must be:
   - **Self-contained** — Cline will not have the full conversation, only the task text.
   - **Explicit about file paths** — absolute within the repo (e.g. `./index.html`).
   - **Explicit about constraints** — Tailwind via CDN, inline styles, mobile-first, no frameworks.
   - **Ends with a "Verification checklist"** — concrete, checkable items Paolo (or Claude Code on review) can tick off.
3. **Format for handoff tasks:**
   ```
   ## Task: <short name>
   **Goal:** <one sentence>
   **Files:** <paths>
   **Do:**
   - step 1
   - step 2
   **Do NOT:**
   - thing to avoid
   **Verification checklist:**
   - [ ] item 1
   - [ ] item 2
   ```
4. **Review loop.** When Paolo pastes back Cline's output, Claude Code:
   - Reads the actual files on disk (not just the diff summary).
   - Runs screenshot comparison if it's UI work (see §5).
   - Produces a pass/fail verdict with a numbered list of required fixes, if any.
5. **Never assume Cline followed instructions perfectly.** Verify.

6. **Small-context discipline (50k limit).** Cline's window is tight. This means:
   - **One section per task**, never "build the whole page". Hero is a task. Services grid is a task. Footer is a task.
   - **Never ask Cline to refactor the whole file.** Ask it to touch one specific section identified by a clear HTML comment marker (e.g. `<!-- SECTION: hero -->`).
   - **Task text must be under ~800 words.** If a task is longer, split it.
   - **Do not paste the full current `index.html` into the task** unless strictly needed. Paste only the section being edited, plus a 2-line summary of what's around it.
   - When the file grows past ~600 lines, insert explicit section markers so Cline can locate its edits without re-reading everything.
---

## 3. Reference Images & Inspiration

If Paolo supplies a reference image:

- **Copy it 1:1.** Do not "improve", "modernize" or "clean up" anything.
- Match layout, spacing, color, typography as closely as possible.
- Measure: pixel distances, hex colors, font weights, line-heights.
- For any content not available (text, images, logos), use **https://placehold.co/** placeholders with correct dimensions (e.g. `https://placehold.co/600x400`).
- If a choice is ambiguous, ask — do not invent.

---

## 4. Local Server

- **Always serve from `http://localhost:3000`.** Never screenshot `file:///` URLs — rendering differs.
- Server script: `serve.mjs` at repo root.
- Start command: `node serve.mjs` (or `npm run serve`).
- Claude Code must assume the server is running when reviewing; if unsure, instruct Paolo to start it.

---

## 5. Screenshot Workflow (Puppeteer)

Every UI change must be verified visually.

1. **Always screenshot from `http://localhost:3000`.** Never `file:///`.
2. Use `screenshot.mjs`:
   `node screenshot.mjs http://localhost:3000 <label>`
3. Screenshots are saved to `./temporary screenshots/` with auto-incremented names: `screenshot-1.png`, `screenshot-2-hero-v1.png`, etc. **Never overwrite.**
4. **Minimum two review rounds** when a reference image exists:
   - Round 1: build → screenshot → compare → list deltas.
   - Round 2: fix deltas → screenshot → compare again.
5. **Comparison must be specific**, not vibes:
   - Pixel distances (padding, gaps, widths).
   - Hex color values.
   - Font family, weight, size, line-height.
   - Spacing scale.
   Write deltas as: `Hero padding-top: reference 96px, current 64px → fix to 96px`.

---

## 6. Output Defaults

- **Single `index.html`** at repo root with inline `<style>` and inline `<script>` where needed.
- **Tailwind via CDN** (`https://cdn.tailwindcss.com`). No build step.
- **Mobile-first.** Design small → scale up with `sm: md: lg:` breakpoints.
- **Semantic HTML5.** `<header> <main> <section> <footer>`, proper headings hierarchy.
- **Accessibility baseline:** alt text on images, focus states, color contrast AA minimum.

---

## 7. Brand Assets

- **Always check `./brand_assets/` first** before inventing any color, font or logo.
- If assets exist → use them verbatim.
- If empty → use neutral placeholders and flag it to Paolo, do **not** improvise a brand identity.
- **Banned by default:** Tailwind's stock `indigo`, `blue`, `slate` palettes as primary. They scream "AI template". Use custom hex values defined in a small design-tokens block at the top of `<style>`.

---

## 8. Anti-Generic Guardrails

These are the tells of lazy AI output. Avoid all of them.

- ❌ `shadow-md` flat drop shadows on cards → ✅ layered, color-tinted shadows with low opacity.
- ❌ `transition-all` → ✅ explicit: `transition-[transform,opacity] duration-200 ease-out`. **Only animate `transform` and `opacity`** — never layout properties. Prefer spring-style easing.
- ❌ Single sans font everywhere → ✅ pair a **display/serif** font (headings) with a clean **sans** font (body). Load both from Google Fonts. Apply tight tracking (`letter-spacing: -0.03em`) on large headings; generous line-height (`1.7`) on body.
- ❌ Flat solid backgrounds on hero → ✅ layer multiple radial gradients + SVG noise/grain filter for depth.
- ❌ Flat images dropped in as-is → ✅ add a gradient overlay (`bg-gradient-to-t from-black/60`) and a color treatment layer with `mix-blend-multiply`. Use with judgment on already-dark photos.
- ❌ Everything on the same z-plane → ✅ explicit **layering system**: base surface → elevated (cards) → floating (modals/tooltips). Each layer has its own shadow/background treatment.
- ❌ Missing interaction states → ✅ every interactive element has **hover, focus-visible, active** states defined.
- ❌ Default Tailwind spacing applied randomly → ✅ spacing is **intentional** and consistent (pick a scale: 4 / 8 / 16 / 24 / 48 / 96 and stick to it).
- ❌ Generic stock icons → ✅ use Lucide or Heroicons, sized consistently, stroke-width matched.
- ❌ Centered everything → ✅ use asymmetry where it helps hierarchy.

---

## 9. Deploy

- **Localhost only** for now.
- **No git push. No GitHub. No Vercel/Netlify/anything.** Until Paolo explicitly says "deploy".
- Local commits are fine if a `.git` exists, but remotes stay untouched.

---

## 10. Hard Rules — Never Do These

1. Never write frontend code without loading `frontend-design` skill first.
2. Never screenshot from `file:///`.
3. Never overwrite a screenshot in `./temporary screenshots/`.
4. Never push to any remote.
5. Never invent brand colors, fonts, or logos when `brand_assets/` is empty — use placeholders and flag it.
6. Never "improve" a reference image. Copy it 1:1.
7. Never use `transition-all` or flat `shadow-md` as the only shadow.
8. Never ship a UI change without at least one screenshot comparison.
9. Never hand a task to Cline without a verification checklist.
10. Never assume Cline's output is correct — always verify against the files on disk.
11. Never use stock Tailwind `indigo`/`blue` as primary brand color.
12. Never add a build step (webpack, vite, etc.) — stay on CDN Tailwind + single HTML.
13. Never write copy in English for the live site — it's Italian.
