# CLAUDE.md — Ricettario

All'inizio di ogni sessione leggi [PIANO.md](PIANO.md) per lo stato di avanzamento e le verifiche rimaste.

## Regole progetto

- `.env.local` mai committato (contiene le chiavi Supabase)
- Test RLS sempre da app/REST API, mai dall'SQL Editor di Supabase (che bypassa RLS)
- Nessuna registrazione pubblica: in Supabase Auth è disabilitato solo "Enable email signups", il provider Email resta attivo
- Scrittura DB solo per email in `utenti_abilitati` (via funzione `is_authorized()` SECURITY DEFINER)
- Il sito in locale si avvia con `npm run dev`
- Fasi: A (core + verifiche) → B (Roulette + Pantry) → C (AI + keep-alive)
