# DESIGN.md — Ricettario

## Design Principles
- **Mood-first identity**: ogni mood ha personalità distinta (colori + tipografia + dettagli UI), non solo palette swap
- **Mobile-first reale**: 16px margins, max-width ~720px desktop, touch target ≥44px, bottom nav fissa
- **Gerarchia chiara nelle card**: titolo evidente, autore piccolo, badge mood/categoria/tag, tempo/porzioni con icone
- **Stati interattivi**: hover/focus/touch visibili, transizioni <300ms, rispetto `prefers-reduced-motion`
- **WCAG AA ovunque**: testo normale ≥4.5:1, large/UI ≥3:1, testo su accento bottoni ≥4.5:1
- **Tailwind per layout/spacing/typography/states**; CSS custom solo per variabili mood (`data-mood`), `@keyframes`, font

## Color Tokens (Palette per data-mood)

### Base "Tutti" (segue system dark mode)
| Token | Light | Dark |
|-------|-------|------|
| `--sfondo` | #FAF6EF | #1E1914 |
| `--testo` | #2B2118 | #F2EAD9 |
| `--secondario` | #2B2118 | #F2EAD9 |
| `--accento` | #B5532B | #E08A5B |
| `--accento-test` | #FFFFFF | #1E1914 |
| `--card` | #FFFFFF | #2A2218 |
| `--bordo` | #E8DFD4 | #3D3328 |

### Gourmet & Elegante
| Token | Valore |
|-------|--------|
| `--sfondo` | #1A1A1D |
| `--card` | #252627 |
| `--testo` | #F5F5F0 |
| `--secondario` | #F5F5F0 |
| `--accento` | #D4AF37 |
| `--accento-alt` | #C55A11 |
| `--accento-test` | #1A1A1D |
| `--bordo` | #3A3A3D |

### Pasticceria & Bakery
| Token | Valore |
|-------|--------|
| `--sfondo` | #FFFDF9 |
| `--card` | #FFFFFF |
| `--testo` | #3D2B1F |
| `--testo-alt` | #8B5A2B |
| `--secondario` | #3D2B1F |
| `--accento` | #C23B4E |
| `--accento-alt` | #D97724 |
| `--accento-test` | #FFFFFF |
| `--bordo` | #F0E8DD |

### Comfort & Tradizionale
| Token | Valore |
|-------|--------|
| `--sfondo` | #FDFBF7 |
| `--card` | #FFFFFF |
| `--header-sfondo` | #C85A32 |
| `--header-alt` | #3D2B1F |
| `--testo` | #3D2B1F |
| `--secondario` | #3D2B1F |
| `--accento` | #6B8E23 |
| `--accento-alt` | #C0392B |
| `--accento-test` | #FFFFFF |
| `--bordo` | #E8DFD4 |

### Green & Biologica
| Token | Valore |
|-------|--------|
| `--sfondo` | #F4F6F0 |
| `--sfondo-alt` | #FAFAFA |
| `--card` | #FFFFFF |
| `--testo` | #2E4A3E |
| `--secondario` | #2E4A3E |
| `--accento` | #E0633B |
| `--accento-test` | #FFFFFF |
| `--bordo` | #DCE4D8 |

### Spezie & Terracotta (Piatti etnici)
| Token | Valore |
|-------|--------|
| `--sfondo` | #F9F5EC |
| `--card` | #FFFFFF |
| `--secondario` | #B85028 |
| `--accento` | #E5A023 |
| `--accento-alt` | #2A6F97 |
| `--testo` | #2B2118 |
| `--testo-su-accento` | #1A1A1A |
| `--accento-test` | #1A1A1A |
| `--bordo` | #E8DFD4 |

## Tipografia
| Ruolo | Font | Note |
|-------|------|------|
| UI / Body / Elenco | **Inter** (sans) | Default per tutti i mood eccetto Gourmet/Pasticceria |
| Display / Titoli (Gourmet, Pasticceria) | **Playfair Display** (serif) | Eleganza, contrasto con Inter |
| Titoli (altri mood) | **Inter** weight 600-700 | Coerenza sans |
| Monospace (timestamp video) | **JetBrains Mono** | Solo dove serve allineamento numerico |

**Type scale** (clamp per responsive):
- `text-xs` 12px / 1.5
- `text-sm` 14px / 1.5
- `text-base` 16px / 1.6
- `text-lg` 18px / 1.5
- `text-xl` 20px / 1.4
- `text-2xl` 24px / 1.3
- `text-3xl` 30px / 1.2
- `text-4xl` 36px / 1.15

Line length ≤ 75ch per body text.

## Layout & Spacing
- **Container**: `max-w-[720px] mx-auto px-4` (16px mobile, 24px desktop)
- **Spacing scale**: 4, 8, 12, 16, 24, 32, 48 (Tailwind default)
- **Card radius**: `rounded-2xl` (16px) per schede ricetta, `rounded-xl` (12px) per card secondarie
- **Shadow**: `shadow-sm` per card elenco, `shadow-md` per modal/overlay, niente shadow decorative eccessive
- **Bottom nav**: `fixed bottom-0 left-0 right-0 z-50`, altezza 64px + safe-area-inset-bottom
- **Header**: `sticky top-0 z-40`, altezza 56px + safe-area-inset-top

## Componenti Condivisi (B2)

### Header con Selettore Mood a Pillola
```ascii
┌─────────────────────────────────────┐
│  Ricette              [Mood ▼]      │  ← sticky, 56px
│  ─────────────────────────────────  │
│  [Filtri ▼] badge(3)                │  ← expandable
└─────────────────────────────────────┘
```
- Titolo pagina a sinistra
- Selettore mood a pillola (non dropdown nativo): mostra label + chevron, click → overlay con 6 opzioni
- Badge filtri attivi (conta: categoria + tag + veloce + da_completare + mood≠tutti)

### Bottom Navigation (4 tab + FAB "Aggiungi")
```ascii
┌────┬────┬────┬────┐
│ 🏠 │ 🎲 │ 🥫 │ ⚙ │  ← solo loggati vedono FAB centrale
│El. │Rou │Pa. │Imp.│
└────┴────┴────┴────┘
   ╭─────╮
   │  +  │  ← FAB "Aggiungi" (solo loggati), 56px, shadow-lg
   ╰─────╯
```
- Icone `lucide-react`: Home, Shuffle, Package, Settings
- Label sotto icone (12px)
- Stato attivo: colore accento, scale(1.05) al tocco
- FAB solo se autenticato, centra tra tab 2 e 3

### Recipe Card (Elenco)
```ascii
┌────────────────────────────────────┐
│ Panini alla curcuma        [Da co.]│  ← titolo + badge stato
│ di Nonna Maria                     │  ← autore (opzionale)
│ ─────────────────────────────────  │
│ Mood: Green   Categoria: Panini    │  ← meta riga 1
│ [Vegetariano] [Senza glutine] +1   │  ← tag chips (max 2 + overflow)
│ ─────────────────────────────────  │
│ 🕐 30 min    👥 4 porzioni         │  ← footer con icone
└────────────────────────────────────┘
```
- `card` background, `rounded-2xl`, `shadow-sm`
- Hover/touch: `shadow-md` + `translate-y-[-2px]`
- Touch target intera card → navigate to detail

### Pulsanti
| Variante | Classi Tailwind | Uso |
|----------|-----------------|-----|
| Primary | `bg-[var(--accento)] text-[var(--accento-test)] hover:brightness-105 active:brightness-95` | Azioni principali |
| Secondary | `bg-[var(--card)] text-[var(--testo)] border border-[var(--bordo)]` | Azioni secondarie |
| Ghost | `text-[var(--testo)] hover:bg-[var(--bordo)]` | Back, clear |
| Danger | `bg-red-600 text-white` | Elimina |
| FAB | `fixed bottom-24 right-4 w-14 h-14 rounded-full shadow-lg` | Aggiungi |

### Badge
| Tipo | Classi | Uso |
|------|--------|-----|
| Mood | `px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--accento)] text-[var(--accento-test)]` | Card ricetta, header |
| Tag | `px-2 py-0.5 rounded-full text-xs bg-[var(--bordo)] text-[var(--secondario)]` | Tag ingredienti/dieta |
| Stato | `px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300` | "Da completare" |

## Pagine

### B3 — Pagina Elenco
```ascii
┌────────────────────────────────────┐
│ Ricette            [Green ▼]  ●3   │  ← Header sticky
│ ─────────────────────────────────  │
│ [Filtri ▼] ●3                      │  ← Filtri expandable
│ ┌────────────────────────────────┐ │
│ │ Cerca...              [✕]      │ │
│ ├────────────────────────────────┤ │
│ │ Categoria ▼                    │ │
│ ├────────────────────────────────┤ │
│ │ Tag: [Carne] [Verdure] ...     │ │
│ ├────────────────────────────────┤ │
│ │ ☐ Veloce (<30min)  ☐ Da comp.  │ │
│ │ [Cancella filtri]              │ │
│ └────────────────────────────────┘ │
├────────────────────────────────────┤
│ ████████  ████████  ████████       │  ← Grid 1-col mobile, 2-col ≥640px
│ ████████  ████████                 │
└────────────────────────────────────┘
│        ╭─────╮                    │  ← Bottom nav + FAB
│        │  +  │
│        ╰─────╯
```
- Empty state mood: "Nessuna ricetta in questo mood" + btn "Mostra tutti i mood"
- Empty state generale: "Inizia aggiungendo la tua prima ricetta"

### B4 — Pagina Dettaglio
```ascii
┌────────────────────────────────────┐
│ ←  Panini alla curcuma             │  ← Header con back + azioni
│ ─────────────────────────────────  │
│ ℹ️ Info: 30min • 4 porzioni • ✕3   │  ← Card info (tempo, porzioni, volte fatta)
│                                    │
│ 📝 Descrizione                     │  ← Sezioni collassabili
│    Ricetta tradizionale...         │
│                                    │
│ 🥬 Ingredienti              [☐☐☐]  │  ← Per gruppo, scaling porzioni
│   IMPASTO                          │
│   ☐ 500g farina                    │
│   ☐ 300ml acqua                    │
│   CONDIMENTO                       │
│   ☐ 10g sale                       │
│ ─────────────────────────────────  │
│ 👨‍🍳 Procedimento         [Modalità] │  ← Passaggi numerati
│   1. Impastare...                  │
│      🔗 Guarda nel video al 45s    │
│   2. Lievitare...                  │
│                                    │
│ 🔁 Varianti                        │
│   • Versione integrale: ...        │
│                                    │
│ [La faccio!]         [Modifica]    │  ← Azioni (solo loggati)
└────────────────────────────────────┘
```

#### Modalità Cucina (overlay full-screen)
```ascii
┌────────────────────────────────────┐
│  ✕                    Passo 2/5    │  ← Header con progress bar
│ ─────────────────────────────────  │
│                                    │
│       Impastare per 10 min         │  ← Testo gigante, centrato
│                                    │
│        🔗 Guarda nel video al 45s  │
│                                    │
│  ◀ Indietro          Avanti ▶      │  ← Nav grandi, touch-friendly
└────────────────────────────────────┘
```
- Testo `text-4xl`/`text-5xl`, `font-medium`, centrato
- Progress bar in alto
- Swipe left/right per navigare (bonus), pulsanti grandi 56px min

### B5 — Form Add/Edit
- Sezioni collassabili per stato "completa" (categoria, mood, tag, tempo, porzioni, ingredienti, passaggi, varianti, note)
- Stato "da completare": solo titolo obbligatorio
- Autocomplete ingredienti da DB (debounced, max 10)
- Passaggi/varianti: drag-handle (grip), add/remove, riordino
- Validazione inline (zod), errori rossi sotto campi
- Pulsanti footer: Annulla (ghost) | Salva (primary)

### Impostazioni
- Profilo (email, ruolo), Logout
- Export/Import JSON (tutte le ricette)
- Gestione ingredienti base da ignorare (chip rimovibili, input aggiungi)

## Mood-Specific UI Details

| Mood | Detail |
|------|--------|
| **Gourmet** | Filetti dorati (`border-l-2 border-[var(--accento)]`) su card, Playfair Display per titoli, shadow più calda |
| **Pasticceria** | Angoli più morbidi (`rounded-3xl`), accento rosa pastello, texture sottile (pattern SVG opzionale) |
| **Comfort** | Header con background terracotta, accento verde salvia, font Inter weight 500 per calore |
| **Green** | Pulito, molto spazio bianco, accento arancio per CTA, bordi sottili |
| **Spezie** | Bordi stile maiolica (pattern geometrico sottile), accento curcuma giallo, testo scuro su bottoni gialli |

## Animazioni & Interazioni (per C2)
- Cambio mood: `transition-colors duration-300` su `:root`, fade-crossfade contenuto
- Bottom nav: `active:scale-105` + colore accento, ripple CSS
- Card elenco: `hover:shadow-md hover:-translate-y-1 transition-all duration-200`
- Pulsanti: `active:scale-[0.98] transition-transform duration-100`
- Modalità cucina: slide-up enter, slide-down exit, step change fade 150ms
- `prefers-reduced-motion`: disabilita tutte le transizioni non essenziali

## Accessibilità
- Focus visibile: `focus-visible:outline-2 focus-visible:outline-[var(--accento)] focus-visible:outline-offset-2`
- ARIA labels su icon-only buttons
- Contrasto verificato per ogni mood (vedi Color Tokens)
- Touch target ≥ 44×44px
- Heading hierarchy corretta (h1 → h2 → h3)