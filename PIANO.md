# PIANO — Ricettario

Ultimo aggiornamento: 2026-11-07

## Stato generale

FASE A in corso — codice completato, **verifiche mancanti**.
PWA pronta per il deploy su Cloudflare Pages.

## Completato

- [x] Setup Vite + React + TS in `~/Progetti/ricettario`
- [x] `src/lib/config.ts` — 11 categorie, 8 tag ingrediente, 4 tag dieta, 5 mood + base, unità, gruppi, ingredienti base ignorati
- [x] `src/styles/mood-palettes.css` — 6 palette (data-mood), WCAG AA
- [x] `src/lib/supabase.ts` + `database.types.ts` — client tipizzato + helper
- [x] `supabase/schema.sql` — utenti_abilitati, ricette, `is_authorized()` SECURITY DEFINER, RLS, trigger, RPC
- [x] `supabase/seed.sql` — 3 ricette seed
- [x] `AuthContext`, `MoodContext`, `Layout` (header + bottom nav + Aggiungi solo loggati)
- [x] `RecipeList` — ricerca, filtri categoria/tag/veloce/da_completare
- [x] `RecipeDetail` — ingredienti per gruppo, scaling porzioni, spunta, passaggi + video, modalità cucina, modifica/elimina
- [x] `RecipeForm` — react-hook-form + zod, autocomplete ingredienti, validazione, modalità "da completare"
- [x] `Settings` — profilo, logout, export/import JSON, basi ignore
- [x] `Roulette` / `Pantry` — placeholder (FASE B)
- [x] `ErrorBoundary`, `NetworkStatus`, `Loading`
- [x] Route Roulette/Pantry attivate in `App.tsx`
- [x] Build `npm run build` passa
- [x] Tailwind v4 installato e configurato (plugin Vite, token `@theme inline` dai mood, componenti in `@layer` con `@apply`)
- [x] `.env.local` presente (non committato)
- [x] Supabase: schema.sql + seed.sql eseguiti, signup pubblico disabilitato (solo "Enable email signups"), 2 utenti creati + in utenti_abilitati
- [x] BUG 1 fix: elenco mostra tutte le ricette (default), filtro "Da completare" mostra solo quelle (modificato `getRecipes` con parametro `stato` e logica in `RecipeList`)
- [x] BUG 2 fix: dettaglio sicuro per campi NULL/vuoti, aggiunti descrizione/fonte_url, pulsante "Completa" per da_completare, errore visibile in dev via ErrorBoundary
- [x] Migrazione `supabase/migrations/03-fix-seed.sql`: array vuoti espliciti per da_completare, vincolo CHECK per ricette complete
- [x] PWA: manifest.webmanifest, icone (incl. maskable-512 e apple-touch-icon opaca), service worker `public/sw.js` (solo prod, mai cache Supabase, fallback SPA), `_redirects`, meta theme-color dinamico per mood, prompt "Nuova versione" e hint installazione iOS
- [x] Pulizia dipendenze: rimosso eslint (lint via oxlint), `npm ci` pulita senza legacy-peer-deps, engines node >=20.19
- [x] `.github/workflows/keep-alive.yml` (cron ogni 3 giorni + manuale)

## Da fare (verifiche FASE A)

- [x] git init + primo commit `a1b8cc9` (repo GitHub privato da collegare)
- [ ] Verifica login con utente abilitato (dall'app)
- [ ] Verifica registrazione nuova rifiutata (via REST API, non SQL Editor)
- [ ] Test RLS da app/REST: utente abilitato → INSERT ok; anon → INSERT fallisce (mai da SQL Editor)
- [ ] Deploy Cloudflare Pages (repo privato, env vars VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY, NODE_VERSION=22)
- [ ] Test PWA su telefono reale (installazione Android/iOS, reload pagina interna, offline app shell)
- [ ] Test su telefono reale

## FASE B (prossima)

- Roulette funzionante (animazione, filtri, "La facciamo!", esclude da_completare, rispetta mood)
- Pantry "Cosa ho in casa" (autocomplete → chip, calcolo match, sezioni "Pronte ora" / "Ti manca poco")

## FASE C

- [x] Edge Function `ai-assistant` (Gemini, modello `gemini-3.8-flash` default, variabile `GEMINI_MODEL`)
- [x] Migrazione `supabase/migrations/06-ai-usage.sql` (tabella `ai_usage` + RLS solo service_role)
- [x] 4 azioni: `import`, `fill`, `chat`, `substitutions` con structured output (responseJsonSchema)
- [x] Sicurezza: verify_jwt, is_authorized(), rate limit giornaliero (default 100), input limit 20k char, timeout 25s
- [x] CORS limitato: localhost:5173/5174 + `ALLOWED_ORIGIN`
- [x] Errori distinti (401/403/400/429/502/503/504) con messaggi italiani, no log sensibili
- [x] README aggiornato con variabili, deploy, tabella azioni e codici errore
- [ ] Secret `GEMINI_API_KEY` in dashboard Supabase (da fare dall'utente)
- [ ] Migrazione `06-ai-usage.sql` eseguita in SQL Editor (da fare dall'utente)
- [ ] Deploy `supabase functions deploy ai-assistant` (da fare dall'utente)
- [x] GitHub Actions keep-alive ogni 3 giorni (`.github/workflows/keep-alive.yml`, secret SUPABASE_URL + SUPABASE_ANON_KEY da impostare in GitHub)

## Note operative

- Il sito in locale si avvia con `npm run dev` (lo fa l'utente)
- `.env.local` mai committato (in .gitignore)
- Test RLS sempre da app/REST, mai dall'SQL Editor di Supabase
