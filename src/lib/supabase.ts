/**
 * Client Supabase singleton
 * Configurazione centralizzata per tutto l'uso di Supabase nell'app
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

// Variabili d'ambiente (Vite le espone come import.meta.env)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Mancano le variabili d\'ambiente VITE_SUPABASE_URL e/o VITE_SUPABASE_ANON_KEY. ' +
    'Crea un file .env.local con queste variabili.'
  );
}

/**
 * Client Supabase tipizzato con i tipi del database
 * Singleton per evitare multiple istanze
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Persistenza sessione in localStorage (default)
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  // Per evitare warning su realtime non usato
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

/**
 * Helper per verificare se l'utente è autenticato
 */
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
}

/**
 * Helper per ottenere la sessione corrente
 */
export async function getSession() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  return session;
}

/**
 * Login con email e password
 */
export async function signInWithPassword(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

/**
 * Logout
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * Ascolta cambiamenti di autenticazione
 */
export function onAuthStateChange(callback: (event: string, session: unknown) => void) {
  return supabase.auth.onAuthStateChange(callback);
}

/**
 * Tipi per le tabelle principali (estesi dai tipi generati)
 */
export type Recipe = Database['public']['Tables']['ricette']['Row'];
export type RecipeInsert = Database['public']['Tables']['ricette']['Insert'];
export type RecipeUpdate = Database['public']['Tables']['ricette']['Update'];

export type AllowedUser = Database['public']['Tables']['utenti_abilitati']['Row'];
export type AllowedUserInsert = Database['public']['Tables']['utenti_abilitati']['Insert'];

/**
 * Query helper per ricette con filtri comuni
 */
export async function getRecipes(filters?: {
  mood?: string;
  category?: string;
  tags?: string[];
  search?: string;
  onlyComplete?: boolean;
  limit?: number;
  offset?: number;
}) {
  let query = supabase
    .from('ricette')
    .select('*')
    .order('created_at', { ascending: false });

  if (filters?.mood && filters.mood !== 'tutti') {
    query = query.eq('mood', filters.mood);
  }

  if (filters?.category) {
    query = query.eq('categoria', filters.category);
  }

  if (filters?.tags && filters.tags.length > 0) {
    query = query.contains('tags', filters.tags);
  }

  if (filters?.search) {
    query = query.ilike('titolo', `%${filters.search}%`);
  }

  if (filters?.onlyComplete) {
    query = query.eq('stato', 'completa');
  }

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

/**
 * Ottieni una ricetta per ID
 */
export async function getRecipeById(id: string) {
  const { data, error } = await supabase
    .from('ricette')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

/**
 * Crea nuova ricetta
 */
export async function createRecipe(recipe: RecipeInsert) {
  const { data, error } = await supabase
    .from('ricette')
    .insert(recipe)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Aggiorna ricetta
 */
export async function updateRecipe(id: string, updates: RecipeUpdate) {
  const { data, error } = await supabase
    .from('ricette')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Elimina ricetta
 */
export async function deleteRecipe(id: string) {
  const { error } = await supabase
    .from('ricette')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

/**
 * Incrementa contatori "volte_fatta" e aggiorna "ultima_volta"
 */
export async function incrementRecipeMade(id: string) {
  const { data, error } = await supabase.rpc('increment_recipe_made', { recipe_id: id });
  if (error) throw error;
  return data;
}

/**
 * Ottieni tutti gli ingredienti unici dal database (per autocomplete)
 */
export async function getAllIngredients() {
  const { data, error } = await supabase
    .from('ricette')
    .select('ingredienti')
    .eq('stato', 'completa');

  if (error) throw error;

  const ingredients = new Set<string>();
  data?.forEach(recipe => {
    const ingredienti = recipe.ingredienti as unknown as Array<{ nome: string }> | null
    ingredienti?.forEach(ing => {
      if (ing.nome) ingredients.add(ing.nome.toLowerCase().trim());
    });
  });

  return Array.from(ingredients).sort();
}

/**
 * Verifica se l'utente corrente è abilitato (usa la funzione SQL is_authorized)
 */
export async function checkUserAuthorized() {
  const { data, error } = await supabase.rpc('is_authorized');
  if (error) throw error;
  return data as boolean;
}