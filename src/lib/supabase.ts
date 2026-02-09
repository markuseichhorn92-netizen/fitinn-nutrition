import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Check if Supabase is configured
export function isSupabaseConfigured(): boolean {
  return !!(supabaseUrl && supabaseAnonKey && supabaseUrl !== 'https://your-project.supabase.co');
}

// Singleton instance - ONLY ONE client should exist
let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    return null;
  }
  
  if (!supabaseInstance && typeof window !== 'undefined') {
    supabaseInstance = createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        storageKey: 'fitinn-auth',
        autoRefreshToken: true,
        detectSessionInUrl: true, // This should handle the hash params automatically
      },
    });
  }
  
  // For server-side, create a fresh client (no persistence needed)
  if (!supabaseInstance && typeof window === 'undefined') {
    return createClient(supabaseUrl!, supabaseAnonKey!);
  }
  
  return supabaseInstance;
}

// Legacy export - use the singleton!
export const supabase = typeof window !== 'undefined' 
  ? getSupabaseClient() 
  : null;

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
