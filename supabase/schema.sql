/**
 * Schema SQL per il database Supabase - Ricettario
 * Eseguire nell'SQL Editor di Supabase
 *
 * Include:
 * - Tabella utenti_abilitati (con RLS per service_role)
 * - Tabella ricette (con tutti i campi, vincoli CHECK, RLS)
 * - Funzione SECURITY DEFINER is_authorized()
 * - Policy RLS basate su is_authorized()
 * - Trigger updated_at automatico
 * - Indici per performance
 * - Funzione RPC increment_recipe_made
 */

-- ============================================
-- ESTENSIONI
-- ============================================
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================
-- TABELLA UTENTI ABILITATI
-- ============================================
create table if not exists public.utenti_abilitati (
  email text primary key,
  ruolo text not null default 'user' check (ruolo in ('admin', 'user')),
  creato_il timestamptz not null default now()
);

comment on table public.utenti_abilitati is 'Email degli utenti autorizzati a scrivere (admin/user). Letta da policy RLS e Edge Function.';

-- RLS su utenti_abilitati: solo service_role può leggere (per Edge Function)
alter table public.utenti_abilitati enable row level security;

create policy "Service role può leggere utenti_abilitati"
  on public.utenti_abilitati
  for select
  to service_role
  using (true);

-- Nessuna policy per anon/authenticated: non possono leggere questa tabella direttamente

-- ============================================
-- FUNZIONE SECURITY DEFINER: is_authorized()
-- ============================================
-- Controlla se l'email del JWT corrente è in utenti_abilitati
-- search_path fissato per sicurezza (previene search path injection)
create or replace function public.is_authorized()
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_email text;
begin
  -- Estrae email dal JWT di Supabase Auth
  current_email := (current_setting('request.jwt.claims', true))::jsonb ->> 'email';

  if current_email is null then
    return false;
  end if;

  -- Controlla se l'email è in utenti_abilitati
  return exists (
    select 1 from public.utenti_abilitati
    where email = current_email
  );
end;
$$;

comment on function public.is_authorized() is 'Restituisce true se l\'utente autenticato corrente è in utenti_abilitati. Usata nelle policy RLS.';

-- ============================================
-- TABELLA RICETTE
-- ============================================
create table if not exists public.ricette (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Campi obbligatori/principali
  titolo text not null,
  autore text,
  stato text not null default 'completa' check (stato in ('completa', 'da_completare')),
  categoria text check (categoria in (
    'antipasti', 'primi', 'secondi', 'contorni', 'piatti_unici',
    'zuppe', 'lievitati', 'dolci', 'colazione_merende', 'salse_basi', 'bevande'
  )),
  mood text check (mood in ('gourmet', 'pasticceria', 'comfort', 'fresca', 'etnici')),
  difficolta text check (difficolta in ('base', 'facile', 'media', 'difficile')),
  tags text[] default '{}',

  -- Contenuto
  descrizione text,
  porzioni integer,
  porzioni_unita text default 'porzioni',
  tempo_minuti integer,

  -- JSONB per strutture complesse
  ingredienti jsonb,
  passaggi jsonb,
  varianti jsonb,

  -- Extra
  note text,
  fonte_url text,
  volte_fatta integer not null default 0,
  ultima_volta date
);

comment on table public.ricette is 'Ricette dell\'app. Lettura pubblica, scrittura solo per utenti in utenti_abilitati.';

comment on column public.ricette.ingredienti is 'Array di oggetti: {nome, quantita, unita, nota, gruppo}. Nomi normalizzati minuscolo/singolare.';
comment on column public.ricette.passaggi is 'Array di oggetti: {titolo, testo, video_secondi}. In ordine.';
comment on column public.ricette.varianti is 'Array di oggetti: {titolo, testo, video_secondi}. Opzionale.';
comment on column public.ricette.tags is 'Array di tag da due elenchi: ingrediente principale + dieta (solo manuali).';
comment on column public.ricette.stato is 'completa = tutti i campi obbligatori; da_completare = solo titolo obbligatorio.';

-- ============================================
-- INDICI
-- ============================================
create index if not exists idx_ricette_categoria on public.ricette (categoria);
create index if not exists idx_ricette_mood on public.ricette (mood);
create index if not exists idx_ricette_stato on public.ricette (stato);
create index if not exists idx_ricette_created_at on public.ricette (created_at desc);
create index if not exists idx_ricette_autore on public.ricette (autore);
create index if not exists idx_ricette_difficolta on public.ricette (difficolta);
create index if not exists idx_ricette_tags on public.ricette using gin (tags);

-- Indice per ricerca full-text su titolo (opzionale, per performance)
create index if not exists idx_ricette_titolo_fts on public.ricette using gin (to_tsvector('italian', titolo));

-- ============================================
-- RLS SU RICETTE
-- ============================================
alter table public.ricette enable row level security;

-- SELECT: tutti (anon + authenticated) possono leggere
create policy "Lettura pubblica ricette"
  on public.ricette
  for select
  to anon, authenticated
  using (true);

-- INSERT: solo utenti autorizzati
create policy "Inserimento ricette solo utenti abilitati"
  on public.ricette
  for insert
  to authenticated
  with check (public.is_authorized());

-- UPDATE: solo utenti autorizzati
create policy "Aggiornamento ricette solo utenti abilitati"
  on public.ricette
  for update
  to authenticated
  using (public.is_authorized())
  with check (public.is_authorized());

-- DELETE: solo utenti autorizzati
create policy "Eliminazione ricette solo utenti abilitati"
  on public.ricette
  for delete
  to authenticated
  using (public.is_authorized());

-- ============================================
-- TRIGGER updated_at AUTOMATICO
-- ============================================
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trigger_ricette_updated_at on public.ricette;
create trigger trigger_ricette_updated_at
  before update on public.ricette
  for each row
  execute function public.handle_updated_at();

-- ============================================
-- FUNZIONE RPC: increment_recipe_made
-- ============================================
-- Incrementa volte_fatta e imposta ultima_volta a oggi
create or replace function public.increment_recipe_made(recipe_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  result jsonb;
begin
  update public.ricette
  set
    volte_fatta = volte_fatta + 1,
    ultima_volta = current_date,
    updated_at = now()
  where id = recipe_id
  returning jsonb_build_object('volte_fatta', volte_fatta, 'ultima_volta', ultima_volta)
  into result;

  if result is null then
    raise exception 'Ricetta non trovata: %', recipe_id;
  end if;

  return result;
end;
$$;

comment on function public.increment_recipe_made(uuid) is 'Incrementa volte_fatta e imposta ultima_volta a oggi. Restituisce i nuovi valori.';

-- ============================================
-- VINCOLI AGGIUNTIVI (opzionali, per integrità dati)
-- ============================================
-- Vincolo: se stato = 'completa' allora categoria e mood non possono essere null
-- (gestito a livello applicativo, ma si può aggiungere qui se si vuole)
-- alter table public.ricette
-- add constraint chk_completa_requires_categoria_mood
-- check (
--   stato = 'da_completare'
--   or (categoria is not null and mood is not null)
-- );

-- Vincolo: tags devono essere solo valori validi
-- (gestito a livello applicativo; i CHECK su array sono complessi in PostgreSQL)