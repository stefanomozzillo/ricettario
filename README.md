# Ricettario

App web personale per ricette sincronizzata tra dispositivi, con interfaccia in italiano, mobile-first e palette colori per mood.

## Stack

- **Frontend**: Vite + React 18 + TypeScript
- **Database/Auth**: Supabase (piano gratuito)
- **Hosting**: Cloudflare Pages (repo GitHub privato)
- **AI** (FASE C): Supabase Edge Functions + Google Gemini

## Setup locale

```bash
# 1. Installa dipendenze (installazione pulita, come su Cloudflare)
npm ci

# 2. Crea .env.local con le credenziali Supabase (già presente, non committare)
cp .env.example .env.local
# modifica .env.local con VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY

# 3. Avvia dev server
npm run dev
```

## Deploy (Cloudflare Pages)

- **Build command**: `npm run build`
- **Output directory**: `dist`
- **Variabili d'ambiente** (Project Settings → Environment variables):
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `NODE_VERSION` = `22`
- Per la Edge Function `ai-assistant`, imposta il secret `ALLOWED_ORIGIN` con l'indirizzo di produzione (es. `https://tuo-dominio.pages.dev`).
- Le pagine interne (`/recipe/...`, `/gallery`) funzionano al reload grazie a `public/_redirects` (`/* → /index.html 200`).

## Installazione sul telefono (PWA)

- **Android (Chrome)**: menu ⋮ → "Installa app" / "Aggiungi a schermata Home".
- **iPhone (Safari)**: pulsante **Condividi** → **Aggiungi alla schermata Home**.

L'app è una PWA: `manifest.webmanifest`, service worker (`public/sw.js`, solo in produzione) con precache dell'app shell e cache dei soli asset statici — le chiamate a Supabase e gli URL firmati delle foto vanno sempre in rete. Su iOS Safari compare una sola volta un suggerimento con le istruzioni di installazione.

## FASE C — Assistente AI (Edge Function + Gemini)

### Variabili d'ambiente richieste

| Variabile | Descrizione | Obbligatoria | Default |
|-----------|-------------|--------------|---------|
| `GEMINI_API_KEY` | Chiave API Google AI Studio (Gemini) | **Sì** | — |
| `GEMINI_MODEL` | Modello Gemini da usare | No | `gemini-3.8-flash` |
| `ALLOWED_ORIGIN` | Origin di produzione per CORS (es. `https://tuo-dominio.pages.dev`) | No | `http://localhost:5173` |
| `AI_DAILY_LIMIT` | Limite richieste AI al giorno per utente | No | `100` |

La `GEMINI_API_KEY` va impostata come **secret** della Edge Function nel dashboard Supabase (Project Settings → Edge Functions → Secrets), **non** in `.env.local`.

### Migrazione database

Esegui `supabase/migrations/06-ai-usage.sql` nell'SQL Editor di Supabase. Crea la tabella `ai_usage` per il rate limit giornaliero (RLS attiva, accesso solo via `service_role`).

### Deploy Edge Function

```bash
# 1. Imposta i secret (GEMINI_API_KEY obbligatoria)
supabase secrets set GEMINI_API_KEY=your-key GEMINI_MODEL=gemini-3.8-flash ALLOWED_ORIGIN=https://tuo-dominio.pages.dev AI_DAILY_LIMIT=100

# 2. Deploy della funzione
supabase functions deploy ai-assistant
```

La funzione ha `verify_jwt` attivo (default). Chiama l'endpoint:
```
https://<project-ref>.supabase.co/functions/v1/ai-assistant
```
con header `Authorization: Bearer <access_token>` e body JSON `{action, ...}`.

### Azioni disponibili

| Azione | Body | Descrizione |
|--------|------|-------------|
| `import` | `{testo}` | Incolla ricetta → JSON strutturato |
| `fill` | `{descrizione, ricetta}` | Completa campi vuoti da descrizione libera |
| `chat` | `{ricetta, messaggi[]}` | Chat contestuale sulla ricetta |
| `substitutions` | `{titolo, ingredienti[], mancanti[]}` | Suggerimenti sostituzioni per ingredienti mancanti |

### Codici errore

- `401` — Autenticazione richiesta / token non valido
- `403` — Utente non in `utenti_abilitati`
- `400` — Body non valido / testo troppo lungo (max 20.000 char)
- `429` — Limite giornaliero AI raggiunto
- `502` — Risposta AI non valida (struttura)
- `503` — Quota Gemini esaurita / modello non disponibile
- `504` — Timeout chiamata Gemini (25 s)

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
