import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Check if Supabase is configured
export function isSupabaseConfigured(): boolean {
  return !!(supabaseUrl && supabaseAnonKey && supabaseUrl !== 'https://your-project.supabase.co');
}

// Singleton instance
let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    return null;
  }
  
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl!, supabaseAnonKey!);
  }
  
  return supabaseInstance;
}

// Legacy export for compatibility
export const supabase = isSupabaseConfigured() 
  ? createClient(supabaseUrl!, supabaseAnonKey!) 
  : null as any;

// Type definitions for database
export interface Profile {
  id: string;
  email: string;
  member_number?: string;
  onboarding_data?: any;
  tdee?: number;
  target_calories?: number;
  macros?: {
    protein: number;
    carbs: number;
    fat: number;
  };
  created_at: string;
  updated_at: string;
}

export interface MealPlanRecord {
  id: string;
  user_id: string;
  date: string;
  meals: any;
  total_calories: number;
  water_intake: number;
  created_at: string;
}

export interface ScannedExtraRecord {
  id: string;
  user_id: string;
  date: string;
  products: any[];
  created_at: string;
}

// Aliases for compatibility with existing code
export type DbProfile = Profile;
export type DbMealPlan = MealPlanRecord;
