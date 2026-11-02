# PRODUCT.md — Ricettario

## Prodotto
App web privata (single-user + admin) per gestione ricette personali, sincronizzata via Supabase, hosting Cloudflare Pages.

## Pubblico
Utente singolo (e opzionale secondo utente "user") che cucina a casa, vuole ritrovare le proprie ricette, scalarle, cucinarle passo-passo. Mobile-first, uso in cucina con mani sporche/bagnate.

## Job primario
- Trovare una ricetta (elenco filtrato per mood, categoria, tag, ricerca)
- Leggerla/seguirla (dettaglio con ingredienti scalati, passaggi, modalità cucina a schermo intero)
- Aggiungere/modificare ricette (form guidato, autocomplete ingredienti, stato "da completare")
- Scegliere cosa cucinare (roulette filtrata, "Cosa ho in casa" — FASE B)

## Differenziatori
- **Mood come identità visiva e filtro**: 6 palette distinte (non solo colore, tipografia e dettagli) che cambiano tutta l'app e filtrano l'elenco
- **Privacy by design**: niente analytics, niente rete nel launcher, solo Supabase per sync
- **Mobile-first reale**: bottom nav, touch target ≥44px, modalità cucina a tutto schermo, ingredienti spuntabili
- **Dati strutturati**: ingredienti per gruppo, passaggi con titolo opzionale + timestamp video, varianti strutturate

## Pagine (MVP + FASE B)
1. **Elenco** — griglia ricette, ricerca, filtri (categoria, tag, veloce, da completare), selettore mood in header
2. **Dettaglio** — ingredienti per gruppo + scaling porzioni, passaggi, modalità cucina, varianti, note, fonte, azioni (modifica, elimina, "La faccio!")
3. **Form** — add/edit, react-hook-form + zod, autocomplete ingredienti, passaggi/varianti riordinabili, stato "da completare"
4. **Impostazioni** — profilo, logout, export/import JSON, ingredienti base da ignorare
5. **Roulette** (FASE B) — animazione, filtri, "La facciamo!"
6. **Cosa ho in casa** (FASE B) — autocomplete → chip, match ricette, sezioni "Pronte ora"/"Ti manca poco"

## Stack
- Vite 8 + React 19 + TypeScript 7
- Tailwind CSS v4 (layout, spacing, typography, states)
- CSS custom properties per mood (data-mood su :root)
- Supabase (DB, Auth, Edge Functions)
- lucide-react per icone
- clsx + tailwind-merge per class composition