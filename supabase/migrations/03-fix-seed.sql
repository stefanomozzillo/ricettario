/**
 * Migrazione: fix seed per ricette da_completare
 * Eseguire nell'SQL Editor di Supabase DOPO schema.sql e seed.sql
 *
 * Corregge le due ricette "da_completare" (Home-made poké bowl, Torta alle mele)
 * che nel seed originale avevano solo i campi minimi. Qui aggiungiamo:
 * - Array vuoti espliciti per ingredienti, passaggi, varianti (invece di NULL)
 * - Valori di default per porzioni_unita
 * - Tag vuoti espliciti
 *
 * Aggiunge anche il vincolo CHECK per ricette "completa" (richiede categoria e mood).
 */

-- ============================================
-- AGGIORNA RICETTE DA_COMPLETARE ESISTENTI
-- ============================================

-- Home-made poké bowl
update public.ricette
set
  ingredienti = '[]'::jsonb,
  passaggi = '[]'::jsonb,
  varianti = '[]'::jsonb,
  tags = '{}'::text[],
  porzioni_unita = 'porzioni',
  note = null,
  descrizione = null,
  fonte_url = null
where titolo = 'Home-made poké bowl' and autore = 'Alix' and stato = 'da_completare';

-- Torta alle mele
update public.ricette
set
  ingredienti = '[]'::jsonb,
  passaggi = '[]'::jsonb,
  varianti = '[]'::jsonb,
  tags = '{}'::text[],
  porzioni_unita = 'porzioni',
  note = null,
  descrizione = null,
  fonte_url = null
where titolo = 'Torta alle mele' and autore = 'Alix' and stato = 'da_completare';

-- ============================================
-- VINCOLO: ricette "completa" richiedono categoria e mood
-- ============================================
-- (Era commentato in schema.sql; lo attiviamo ora per integrità dati)
alter table public.ricette
add constraint chk_completa_requires_categoria_mood
check (
  stato = 'da_completare'
  or (categoria is not null and mood is not null)
);

-- ============================================
-- VERIFICA
-- ============================================
-- select id, titolo, autore, stato, categoria, mood, tags,
--        porzioni, porzioni_unita, tempo_minuti,
--        ingredienti, passaggi, varianti, note, descrizione, fonte_url
-- from public.ricette
-- order by created_at;