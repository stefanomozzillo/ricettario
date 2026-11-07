/**
 * Migrazione 06: tabella ai_usage per il rate limit dell'assistente AI.
 *
 * ESEGUIRE nell'SQL Editor di Supabase (NON qui).
 *
 * - RLS attiva, NESSUNA policy per anon/authenticated:
 *   la legge/scrive solo la Edge Function con service_role.
 * - PK (user_id, giorno): un conteggio al giorno per utente.
 */

create table if not exists public.ai_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  giorno date not null,
  conteggio integer not null default 0 check (conteggio >= 0),
  primary key (user_id, giorno)
);

comment on table public.ai_usage is 'Rate limit giornaliero dell\'assistente AI. Accessibile solo via service_role (Edge Function), mai dai client.';

alter table public.ai_usage enable row level security;

-- Unica policy: solo il service role (usato dalla Edge Function) può leggere/scrivere.
create policy "Solo service role può accedere ad ai_usage"
  on public.ai_usage
  for all
  to service_role
  using (true)
  with check (true);

-- Nessuna policy per anon o authenticated: i client non vedono né scrivono questa tabella.
