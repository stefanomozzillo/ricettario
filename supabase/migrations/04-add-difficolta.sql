/**
 * Migrazione 04: ajoute colonna "difficolta" alla tabella ricette
 * Eseguire nell'SQL Editor di Supabase DOPO schema.sql
 *
 * Aggiunge la colonna difficolta (facile/media/difficile, nullable)
 * usata dal form, dalla card e dai filtri dell'elenco.
 */

alter table public.ricette
  add column if not exists difficolta text
  check (difficolta in ('facile', 'media', 'difficile'));

comment on column public.ricette.difficolta is 'Difficoltà recette: facile, media oppure difficile. Opzionale.';

create index if not exists idx_ricette_difficolta on public.ricette (difficolta);
