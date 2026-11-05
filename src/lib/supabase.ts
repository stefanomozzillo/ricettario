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
 * Opzioni di ordinamento per le ricette
 */
export type SortOption =
  | 'tempo_asc'
  | 'tempo_desc'
  | 'title_asc'
  | 'title_desc'
  | 'most_cooked'
  | 'most_recent';

/**
 * Query helper per ricette con filtri comuni
 */
export async function getRecipes(filters?: {
  mood?: string;
  category?: string;
  tags?: string[];
  search?: string;
  stato?: 'completa' | 'da_completare';
  difficolta?: string;
  autore?: string;
  sort?: SortOption;
  limit?: number;
  offset?: number;
}) {
  let query = supabase
    .from('ricette')
    .select('*');

  // Applica filtri
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

  if (filters?.stato) {
    query = query.eq('stato', filters.stato);
  }

  if (filters?.difficolta) {
    query = query.eq('difficolta', filters.difficolta);
  }

  if (filters?.autore) {
    query = query.eq('autore', filters.autore);
  }

  // Applica ordinamento
  const sortOption = filters?.sort || 'most_recent';
  switch (sortOption) {
    case 'tempo_asc':
      query = query.order('tempo_minuti', { ascending: true });
      break;
    case 'tempo_desc':
      query = query.order('tempo_minuti', { ascending: false });
      break;
    case 'title_asc':
      query = query.order('titolo', { ascending: true });
      break;
    case 'title_desc':
      query = query.order('titolo', { ascending: false });
      break;
    case 'most_cooked':
      query = query.order('volte_fatta', { ascending: false });
      break;
    case 'most_recent':
    default:
      query = query.order('created_at', { ascending: false });
      break;
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
 * Ottieni tutti gli autori unici dal database (per dropdown filtro autore)
 */
export async function getAllAuthors() {
  const { data, error } = await supabase
    .from('ricette')
    .select('autore')
    .not('autore', 'is', null);

  if (error) throw error;

  const authors = new Set<string>();
  data?.forEach(recipe => {
    if (recipe.autore) authors.add(recipe.autore.trim());
  });

  return Array.from(authors).sort((a, b) => a.localeCompare(b, 'it'));
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
  console.log('SUPABASE INSERT PAYLOAD:', recipe);
  const { data, error } = await supabase
    .from('ricette')
    .insert(recipe)
    .select()
    .single();
  console.log('4. Supabase insert response:', data, 'error:', error);
  if (error) throw error;
  return data;
}

/**
 * Aggiorna ricetta
 */
export async function updateRecipe(id: string, updates: RecipeUpdate) {
  const payload = { ...updates, updated_at: new Date().toISOString() };
  console.log('SUPABASE UPDATE PAYLOAD:', payload);
  const { data, error } = await supabase
    .from('ricette')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  console.log('4. Supabase response data:', data, 'error:', error);
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