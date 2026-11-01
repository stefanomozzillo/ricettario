/**
 * Configurazione centrale dell'app ricettario
 * Modifica qui per cambiare categorie, tag, mood, palette, ingredienti base
 */

// ============================================
// CATEGORIE (11 valori - categoria obbligatoria se stato='completa')
// ============================================
export const CATEGORIE = [
  'antipasti',
  'primi',
  'secondi',
  'contorni',
  'piatti_unici',
  'zuppe',
  'lievitati',
  'dolci',
  'colazione_merende',
  'salse_basi',
  'bevande',
] as const;

export type Categoria = (typeof CATEGORIE)[number];

export const CATEGORIE_LABELS: Record<Categoria, string> = {
  antipasti: 'Antipasti',
  primi: 'Primi',
  secondi: 'Secondi',
  contorni: 'Contorni',
  piatti_unici: 'Piatti unici',
  zuppe: 'Zuppe',
  lievitati: 'Lievitati',
  dolci: 'Dolci',
  colazione_merende: 'Colazione e merende',
  salse_basi: 'Salse e basi',
  bevande: 'Bevande',
};

// ============================================
// TAG INGREDIENTE PRINCIPALE (8 valori)
// ============================================
export const TAG_INGREDIENTE = [
  'carne',
  'pesce',
  'verdure',
  'legumi',
  'uova_latticini',
  'cereali',
  'frutta',
  'funghi',
] as const;

export type TagIngrediente = (typeof TAG_INGREDIENTE)[number];

export const TAG_INGREDIENTE_LABELS: Record<TagIngrediente, string> = {
  carne: 'Carne',
  pesce: 'Pesce',
  verdure: 'Verdure',
  legumi: 'Legumi',
  uova_latticini: 'Uova e latticini',
  cereali: 'Cereali',
  frutta: 'Frutta',
  funghi: 'Funghi',
};

// ============================================
// TAG DIETA (4 valori - solo impostabili manualmente)
// ============================================
export const TAG_DIETA = [
  'vegetariano',
  'vegano',
  'senza_glutine',
  'senza_lattosio',
] as const;

export type TagDieta = (typeof TAG_DIETA)[number];

export const TAG_DIETA_LABELS: Record<TagDieta, string> = {
  vegetariano: 'Vegetariano',
  vegano: 'Vegano',
  senza_glutine: 'Senza glutine',
  senza_lattosio: 'Senza lattosio',
};

// Tutti i tag combinati per validazione
export const ALL_TAGS = [...TAG_INGREDIENTE, ...TAG_DIETA] as const;
export type Tag = (typeof ALL_TAGS)[number];

export const TAG_LABELS: Record<Tag, string> = {
  ...TAG_INGREDIENTE_LABELS,
  ...TAG_DIETA_LABELS,
};

// ============================================
// MOOD (5 valori + base "tutti")
// ============================================
export const MOODS = [
  'gourmet',
  'pasticceria',
  'comfort',
  'fresca',
  'etnici',
] as const;

export type Mood = (typeof MOODS)[number] | 'tutti';

export const MOOD_LABELS: Record<Mood, string> = {
  tutti: 'Tutti',
  gourmet: 'Gourmet',
  pasticceria: 'Pasticceria',
  comfort: 'Comfort',
  fresca: 'Fresca',
  etnici: 'Piatti etnici',
};

// Ordine per il selettore (base per primo)
export const MOOD_OPTIONS: Mood[] = ['tutti', ...MOODS];

// ============================================
// INGREDIENTI BASE DA IGNORARE in "Cosa ho in casa"
// Modificabile dall'utente in Impostazioni
// ============================================
export const DEFAULT_IGNORED_INGREDIENTS = [
  'sale',
  'pepe',
  'olio',
  'acqua',
  'zucchero',
] as const;

export type IgnoredIngredient = (typeof DEFAULT_IGNORED_INGREDIENTS)[number];

// ============================================
// UNITÀ DI MISURA COMUNI (per autocomplete nel form)
// ============================================
export const COMMON_UNITS = [
  'g', 'kg', 'mg',
  'ml', 'l', 'cl',
  'cucchiaio', 'cucchiai', 'cucchiaini', 'cucchiaino',
  'tazza', 'tazze',
  'pezzo', 'pezzi',
  'spicchio', 'spicchi',
  'foglia', 'foglie',
  'rametto', 'rametti',
  'pizzico', 'q.b.', 'qb',
] as const;

export type UnitaMisura = (typeof COMMON_UNITS)[number];

// ============================================
// GRUPPI INGREDIENTI COMUNI (per autocomplete nel form)
// ============================================
export const COMMON_GROUPS = [
  'impasto',
  'ripieno',
  'decorazione',
  'condimento',
  'salsa',
  'guarnizione',
  'base',
  'copertura',
  'farcia',
  'marinatura',
] as const;

export type GruppoIngrediente = (typeof COMMON_GROUPS)[number];

// Alias per compatibilità
export const GRUPPI_INGREDIENTI = COMMON_GROUPS;

// ============================================
// TIPO INGREDIENTE (per form e dettaglio)
// ============================================
export interface Ingrediente {
  nome: string
  quantita: number | string | null
  unita: string | null
  gruppo: string | null
  note: string | null
}

// ============================================
// TIPO PASSAGGIO (per form e dettaglio)
// ============================================
export interface Passaggio {
  testo: string
  video_url: string | null
}

// ============================================
// STATO RICETTA
// ============================================
export const STATO_RICETTA = ['completa', 'da_completare'] as const;
export type StatoRicetta = (typeof STATO_RICETTA)[number];

export const STATO_LABELS: Record<StatoRicetta, string> = {
  completa: 'Completa',
  da_completare: 'Da completare',
};

// ============================================
// PORZIONI UNITÀ DEFAULT
// ============================================
export const DEFAULT_PORZIONI_UNITA = 'porzioni';

// ============================================
// TEMPO VELOCE (soglia per filtro "veloce")
// ============================================
export const TEMPO_VELOCE_MINUTI = 30;

// ============================================
// GIORNI PER ESCLUSIONE ROULETTE (ultime N giorni)
// ============================================
export const ROULETTE_EXCLUDE_DAYS = 14;