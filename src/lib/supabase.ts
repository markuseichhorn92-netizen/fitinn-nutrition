// Supabase client setup
// Falls back to localStorage if Supabase is not configured

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabase: SupabaseClient | null = null;

// Check if Supabase is configured
export function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL && 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

// Get Supabase client (lazy initialization)
export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    return null;
  }
  
  if (!supabase) {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      }
    );
  }
  
  return supabase;
}

// Type definitions for database tables
export interface DbProfile {
  id: string;
  email: string | null;
  member_number: string | null;
  onboarding_data: Record<string, unknown> | null;
  tdee: number | null;
  target_calories: number | null;
  macros: { protein: number; carbs: number; fat: number } | null;
  created_at: string;
  updated_at: string;
}

export interface DbMealPlan {
  id: string;
  user_id: string;
  date: string;
  meals: Record<string, unknown>;
  total_calories: number | null;
  water_intake: number;
  created_at: string;
}

export interface DbFavorite {
  user_id: string;
  recipe_id: string;
  source: string;
  created_at: string;
}

export interface DbShoppingList {
  id: string;
  user_id: string;
  week_start: string | null;
  items: Record<string, unknown> | null;
  created_at: string;
}
