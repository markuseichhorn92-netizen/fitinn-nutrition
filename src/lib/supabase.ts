import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
