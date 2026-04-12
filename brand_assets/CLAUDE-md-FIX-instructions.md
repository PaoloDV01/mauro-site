# Istruzioni per applicare il fix al CLAUDE.md

Non ti riscrivo tutto il CLAUDE.md per non confonderti con un file enorme dove cambiano
solo 2 righe. Fai questi 2 micro-edit a mano:

## Edit 1 — Riga ~28 della §2

TROVA:
```
The actual implementation is done by **Cline + GLM 5.1** (200k context) acting as the **EXECUTOR**.
```

SOSTITUISCI CON:
```
The actual implementation is done by **Cline + GLM 5.1** (50k context — small window, plan accordingly) acting as the **EXECUTOR**.
```

## Edit 2 — Aggiungi il punto 6 alla fine della lista numerata di §2

Dopo il punto "5. **Never assume Cline followed instructions perfectly.** Verify.",
aggiungi una nuova riga vuota e poi incolla:

```
6. **Small-context discipline (50k limit).** Cline's window is tight. This means:
   - **One section per task**, never "build the whole page". Hero is a task. Services grid is a task. Footer is a task.
   - **Never ask Cline to refactor the whole file.** Ask it to touch one specific section identified by a clear HTML comment marker (e.g. `<!-- SECTION: hero -->`).
   - **Task text must be under ~800 words.** If a task is longer, split it.
   - **Do not paste the full current `index.html` into the task** unless strictly needed. Paste only the section being edited, plus a 2-line summary of what's around it.
   - When the file grows past ~600 lines, insert explicit section markers so Cline can locate its edits without re-reading everything.
```

Salva. Fatto.
