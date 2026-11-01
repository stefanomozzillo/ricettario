/**
 * Seed SQL per il database Supabase - Ricettario
 * Eseguire nell'SQL Editor di Supabase DOPO schema.sql
 *
 * Inserisce esattamente le 3 ricette specificate:
 * 1. Panini alla curcuma (completa, lievitati, pasticceria, tags: [cereali])
 * 2. Home-made poké bowl (da_completare, piatti_unici, etnici)
 * 3. Torta alle mele (da_completare, dolci, pasticceria)
 *
 * Ingredienti normalizzati: minuscolo, singolare, quantità numeriche separate da unità
 */

-- ============================================
-- 1) PANINI ALLA CURCUMA
-- ============================================
insert into public.ricette (
  titolo, autore, stato, categoria, mood, tags,
  porzioni, porzioni_unita, tempo_minuti,
  fonte_url, note,
  ingredienti, passaggi, varianti
) values (
  'Panini alla curcuma',
  'Stefi',
  'completa',
  'lievitati',
  'pasticceria',
  '{"cereali"}',
  20,
  'panini',
  null,
  'https://www.youtube.com/watch?v=8UYJTb-u51w',
  'Resa: 20 panini da circa 40 g l''uno. Tempo di lievitazione totale: circa 3 ore.',
  '[
    {"nome": "farina 0", "quantita": 500, "unita": "g", "nota": null, "gruppo": "impasto"},
    {"nome": "lievito di birra fresco", "quantita": 5, "unita": "g", "nota": null, "gruppo": "impasto"},
    {"nome": "latte", "quantita": 300, "unita": "ml", "nota": "tiepido", "gruppo": "impasto"},
    {"nome": "curcuma", "quantita": 5, "unita": "g", "nota": null, "gruppo": "impasto"},
    {"nome": "miele", "quantita": 2, "unita": "cucchiaini", "nota": null, "gruppo": "impasto"},
    {"nome": "sale", "quantita": 5, "unita": "g", "nota": null, "gruppo": "impasto"},
    {"nome": "burro", "quantita": 50, "unita": "g", "nota": "ammorbidito a temperatura ambiente", "gruppo": "impasto"},
    {"nome": "latte", "quantita": null, "unita": "q.b.", "nota": "a temperatura ambiente, per spennellare", "gruppo": "decorazione"},
    {"nome": "semi di papavero", "quantita": null, "unita": "q.b.", "nota": null, "gruppo": "decorazione"}
  ]'::jsonb,
  '[
    {"titolo": "Preparazione dell''impasto", "testo": "Nella ciotola della planetaria (o a mano in una terrina) versare la farina 0, il lievito di birra fresco sbriciolato, il latte tiepido, la curcuma e il miele. Iniziare ad impastare con il gancio a velocità medio-bassa.", "video_secondi": 38},
    {"titolo": "Integrazione di sale e burro", "testo": "Quando l''impasto comincia a compattarsi, aggiungere il sale. Non appena si stacca dalle pareti dell''impastatrice, unire il burro ammorbidito a pezzetti, facendolo incorporare un po'' alla volta. Lavorare complessivamente per 10-12 minuti finché l''impasto non diventa morbido e leggermente appiccicoso.", "video_secondi": 87},
    {"titolo": "Prima lievitazione", "testo": "Trasferire l''impasto su un piano leggermente infarinato, formare una palla e riporlo in una terrina infarinata. Coprire con pellicola e far lievitare nel forno spento con la luce accesa per circa 2 ore (fino al raddoppio del volume).", "video_secondi": 123},
    {"titolo": "Formatura delle palline", "testo": "Sgonfiare delicatamente l''impasto. Ricavare porzioni da circa 40 g ciascuna. Per ogni panino, ripiegare i bordi verso il centro per 8 volte, sigillare la base e pirlare con il palmo della mano per ottenere una pallina liscia. Disporre le palline ben distanziate su due teglie coperte di carta forno (10 panini per teglia).", "video_secondi": 169},
    {"titolo": "Seconda lievitazione", "testo": "Coprire le teglie con pellicola trasparente senza tirarla troppo e lasciar lievitare per 45–60 minuti.", "video_secondi": 217},
    {"titolo": "Cottura", "testo": "Spennellare delicatamente la superficie con il latte a temperatura ambiente e cospargere con i semi di papavero. Infornare in forno statico preriscaldato a 180 °C per 15–18 minuti. Sfornare e far raffreddare.", "video_secondi": 245}
  ]'::jsonb,
  '[
    {"titolo": "Salmone & cetriolo", "testo": "Spennellare un lato con burro ammorbidito, aggiungere salmone affumicato e fettine sottili di cetriolo.", "video_secondi": 314},
    {"titolo": "Tacchino & spinacino", "testo": "Spalmare una salsa di maionese e senape, aggiungere fette di arrosto di tacchino e foglioline di spinacino fresco.", "video_secondi": 333},
    {"titolo": "Variante dolce", "testo": "Essendo neutri e profumati, sono ottimi anche con crema al cacao o marmellata.", "video_secondi": 362}
  ]'::jsonb
);

-- ============================================
-- 2) HOME-MADE POKÉ BOWL
-- ============================================
insert into public.ricette (
  titolo, autore, stato, categoria, mood
) values (
  'Home-made poké bowl',
  'Alix',
  'da_completare',
  'piatti_unici',
  'etnici'
);

-- ============================================
-- 3) TORTA ALLE MELE
-- ============================================
insert into public.ricette (
  titolo, autore, stato, categoria, mood
) values (
  'Torta alle mele',
  'Alix',
  'da_completare',
  'dolci',
  'pasticceria'
);

-- ============================================
-- VERIFICA INSERIMENTO
-- ============================================
-- select id, titolo, autore, stato, categoria, mood, tags, porzioni, porzioni_unita
-- from public.ricette
-- order by created_at;