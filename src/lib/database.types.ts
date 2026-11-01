/**
 * Tipi TypeScript generati dallo schema del database Supabase
 * Aggiorna questo file dopo aver eseguito le migrazioni SQL
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      ricette: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          titolo: string;
          autore: string | null;
          stato: 'completa' | 'da_completare';
          categoria: string | null;
          mood: string | null;
          tags: string[] | null;
          descrizione: string | null;
          porzioni: number | null;
          porzioni_unita: string | null;
          tempo_minuti: number | null;
          ingredienti: Json | null;
          passaggi: Json | null;
          varianti: Json | null;
          note: string | null;
          fonte_url: string | null;
          volte_fatta: number | null;
          ultima_volta: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          titolo: string;
          autore?: string | null;
          stato?: 'completa' | 'da_completare';
          categoria?: string | null;
          mood?: string | null;
          tags?: string[] | null;
          descrizione?: string | null;
          porzioni?: number | null;
          porzioni_unita?: string | null;
          tempo_minuti?: number | null;
          ingredienti?: Json | null;
          passaggi?: Json | null;
          varianti?: Json | null;
          note?: string | null;
          fonte_url?: string | null;
          volte_fatta?: number | null;
          ultima_volta?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          titolo?: string;
          autore?: string | null;
          stato?: 'completa' | 'da_completare';
          categoria?: string | null;
          mood?: string | null;
          tags?: string[] | null;
          descrizione?: string | null;
          porzioni?: number | null;
          porzioni_unita?: string | null;
          tempo_minuti?: number | null;
          ingredienti?: Json | null;
          passaggi?: Json | null;
          varianti?: Json | null;
          note?: string | null;
          fonte_url?: string | null;
          volte_fatta?: number | null;
          ultima_volta?: string | null;
        };
        Relationships: [];
      };
      utenti_abilitati: {
        Row: {
          email: string;
          ruolo: string | null;
          creato_il: string;
        };
        Insert: {
          email: string;
          ruolo?: string | null;
          creato_il?: string;
        };
        Update: {
          email?: string;
          ruolo?: string | null;
          creato_il?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_authorized: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      increment_recipe_made: {
        Args: { recipe_id: string };
        Returns: {
          volte_fatta: number;
          ultima_volta: string;
        } | null;
      };
    };
    Enums: {
      stato_ricetta: 'completa' | 'da_completare';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}