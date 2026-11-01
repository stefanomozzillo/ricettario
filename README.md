# Ricettario

App web personale per ricette sincronizzata tra dispositivi, con interfaccia in italiano, mobile-first e palette colori per mood.

## Stack

- **Frontend**: Vite + React 18 + TypeScript
- **Database/Auth**: Supabase (piano gratuito)
- **Hosting**: Cloudflare Pages (repo GitHub privato)
- **AI** (FASE C): Supabase Edge Functions + Google Gemini

## Setup locale

```bash
# 1. Installa dipendenze
npm install --legacy-peer-deps

# 2. Crea .env.local con le credenziali Supabase (già presente, non committare)
cp .env.example .env.local
# modifica .env.local con VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY

# 3. Avvia dev server
npm run dev
```

## Struttura

```
ricettario/
├── src/
│   ├── components/     # Layout, ErrorBoundary, NetworkStatus, Loading
│   ├── pages/          # RecipeList, RecipeDetail, RecipeForm, Settings, Roulette, Pantry
│   ├── contexts/       # AuthContext, MoodContext
│   ├── lib/            # supabase.ts, config.ts, database.types.ts
│   └── styles/         # mood-palettes.css, index.css
├── supabase/
│   ├── schema.sql      # Schema DB + RLS + funzione is_authorized()
│   ├── seed.sql        # 3 ricette seed
│   └── functions/      # Edge Functions AI (FASE C)
└── .github/workflows/  # keep-alive (FASE C)
```

## Sicurezza

- Nessuna registrazione pubblica (signup disabilitato in Supabase Auth, provider Email attivo)
- RLS: lettura per tutti, scrittura solo per email in `utenti_abilitati`
- Funzione `is_authorized()` SECURITY DEFINER per le policy RLS
- Test RLS da app/REST API, mai dall'SQL Editor (che bypassa RLS)

## Comandi utili

```bash
npm run dev      # Dev server su :5173
npm run build    # Build produzione in dist/
npm run preview  # Preview build locale
```

## Stato progetto

Vedi [PIANO.md](PIANO.md) per lo stato di avanzamento e le verifiche rimaste.
