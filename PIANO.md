# PIANO — Ricettario

Ultimo aggiornamento: 2026-11-01

## Stato generale

FASE A in corso — codice completato, **verifiche mancanti**.

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

## Da fare (verifiche FASE A)

- [x] git init + primo commit `a1b8cc9` (repo GitHub privato da collegare)
- [ ] Verifica login con utente abilitato (dall'app)
- [ ] Verifica registrazione nuova rifiutata (via REST API, non SQL Editor)
- [ ] Test RLS da app/REST: utente abilitato → INSERT ok; anon → INSERT fallisce (mai da SQL Editor)
- [ ] Deploy Cloudflare Pages (repo privato, env vars VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)
- [ ] Test su telefono reale

## FASE B (prossima)

- Roulette funzionante (animazione, filtri, "La facciamo!", esclude da_completare, rispetta mood)
- Pantry "Cosa ho in casa" (autocomplete → chip, calcolo match, sezioni "Pronte ora" / "Ti manca poco")

## FASE C

- Edge Function `ai-assistant` (Gemini, modello da verificare su docs ufficiali), secret GEMINI_API_KEY
- Chat contestuale nel dettaglio, sostituzioni in pantry, importa da testo
- GitHub Actions keep-alive ogni 3 giorni

## Note operative

- Il sito in locale si avvia con `npm run dev` (lo fa l'utente)
- `.env.local` mai committato (in .gitignore)
- Test RLS sempre da app/REST, mai dall'SQL Editor di Supabase
