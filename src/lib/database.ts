// Database abstraction layer
// Uses Supabase if configured, otherwise falls back to localStorage

import { getSupabaseClient, isSupabaseConfigured, DbProfile, DbMealPlan } from './supabase';
import { UserProfile, DayPlan } from '@/types';

// Storage keys for localStorage fallback
const STORAGE_KEYS = {
  profile: 'fitinn_user_profile',
  mealPlans: 'fitinn_meal_plan',
  waterIntake: 'fitinn_water_intake',
  favorites: 'fitinn_favorites',
  shoppingLists: 'fitinn_shopping_lists',
  onboardingProgress: 'fitinn_onboarding_progress',
} as const;

// Get current user ID (from Supabase auth or localStorage)
async function getCurrentUserId(): Promise<string | null> {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      return user?.id || null;
    }
  }
  // For localStorage mode, use a pseudo-ID
  if (typeof window !== 'undefined') {
    let localId = localStorage.getItem('fitinn_local_user_id');
    if (!localId) {
      localId = `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem('fitinn_local_user_id', localId);
    }
    return localId;
  }
  return null;
}

// ============== Profile Operations ==============

export async function saveProfile(profile: UserProfile): Promise<boolean> {
  const supabase = getSupabaseClient();
  
  if (supabase && isSupabaseConfigured()) {
    try {
      const userId = await getCurrentUserId();
      if (!userId) throw new Error('No user logged in');
      
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          onboarding_data: profile,
          tdee: profile.tdee,
          target_calories: profile.targetCalories,
          macros: profile.macros,
          updated_at: new Date().toISOString(),
        });
      
      if (error) throw error;
      
      // Also save to localStorage as backup
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(profile));
      }
      
      return true;
    } catch (error) {
      console.error('Error saving profile to Supabase:', error);
      // Fall through to localStorage
    }
  }
  
  // localStorage fallback
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(profile));
    return true;
  }
  
  return false;
}

export async function loadProfile(): Promise<UserProfile | null> {
  const supabase = getSupabaseClient();
  
  if (supabase && isSupabaseConfigured()) {
    try {
      const userId = await getCurrentUserId();
      if (!userId) throw new Error('No user logged in');
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      
      if (data && data.onboarding_data) {
        return data.onboarding_data as UserProfile;
      }
    } catch (error) {
      console.error('Error loading profile from Supabase:', error);
      // Fall through to localStorage
    }
  }
  
  // localStorage fallback
  if (typeof window !== 'undefined') {
    const data = localStorage.getItem(STORAGE_KEYS.profile);
    return data ? JSON.parse(data) : null;
  }
  
  return null;
}

// ============== Meal Plan Operations ==============

export async function saveDayPlan(date: string, plan: DayPlan): Promise<boolean> {
  const supabase = getSupabaseClient();
  
  if (supabase && isSupabaseConfigured()) {
    try {
      const userId = await getCurrentUserId();
      if (!userId) throw new Error('No user logged in');
      
      const { error } = await supabase
        .from('meal_plans')
        .upsert({
          user_id: userId,
          date,
          meals: plan.meals,
          total_calories: plan.totalCalories,
          water_intake: plan.waterIntake,
        }, {
          onConflict: 'user_id,date',
        });
      
      if (error) throw error;
      
      // Also save to localStorage as backup
      if (typeof window !== 'undefined') {
        const plans = loadAllPlansSync();
        plans[date] = plan;
        localStorage.setItem(STORAGE_KEYS.mealPlans, JSON.stringify(plans));
      }
      
      return true;
    } catch (error) {
      console.error('Error saving meal plan to Supabase:', error);
      // Fall through to localStorage
    }
  }
  
  // localStorage fallback
  if (typeof window !== 'undefined') {
    const plans = loadAllPlansSync();
    plans[date] = plan;
    localStorage.setItem(STORAGE_KEYS.mealPlans, JSON.stringify(plans));
    return true;
  }
  
  return false;
}

export async function loadDayPlan(date: string): Promise<DayPlan | null> {
  const supabase = getSupabaseClient();
  
  if (supabase && isSupabaseConfigured()) {
    try {
      const userId = await getCurrentUserId();
      if (!userId) throw new Error('No user logged in');
      
      const { data, error } = await supabase
        .from('meal_plans')
        .select('*')
        .eq('user_id', userId)
        .eq('date', date)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
      
      if (data) {
        return {
          date: data.date,
          meals: data.meals as DayPlan['meals'],
          totalCalories: data.total_calories || 0,
          totalMacros: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
          waterIntake: data.water_intake || 0,
          waterGoal: 2.5,
        };
      }
    } catch (error) {
      console.error('Error loading meal plan from Supabase:', error);
      // Fall through to localStorage
    }
  }
  
  // localStorage fallback
  if (typeof window !== 'undefined') {
    const plans = loadAllPlansSync();
    return plans[date] || null;
  }
  
  return null;
}

function loadAllPlansSync(): Record<string, DayPlan> {
  if (typeof window !== 'undefined') {
    const data = localStorage.getItem(STORAGE_KEYS.mealPlans);
    return data ? JSON.parse(data) : {};
  }
  return {};
}

// ============== Water Intake Operations ==============

export async function saveWaterIntake(date: string, amount: number): Promise<boolean> {
  // For water intake, we update the meal plan record
  const plan = await loadDayPlan(date);
  if (plan) {
    plan.waterIntake = amount;
    return saveDayPlan(date, plan);
  }
  
  // localStorage fallback for standalone water tracking
  if (typeof window !== 'undefined') {
    const water = loadAllWaterIntakeSync();
    water[date] = amount;
    localStorage.setItem(STORAGE_KEYS.waterIntake, JSON.stringify(water));
    return true;
  }
  
  return false;
}

export async function loadWaterIntake(date: string): Promise<number> {
  // Try from meal plan first
  const plan = await loadDayPlan(date);
  if (plan?.waterIntake) {
    return plan.waterIntake;
  }
  
  // localStorage fallback
  if (typeof window !== 'undefined') {
    const water = loadAllWaterIntakeSync();
    return water[date] || 0;
  }
  
  return 0;
}

function loadAllWaterIntakeSync(): Record<string, number> {
  if (typeof window !== 'undefined') {
    const data = localStorage.getItem(STORAGE_KEYS.waterIntake);
    return data ? JSON.parse(data) : {};
  }
  return {};
}

// ============== Favorites Operations ==============

export async function saveFavorite(recipeId: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  
  if (supabase && isSupabaseConfigured()) {
    try {
      const userId = await getCurrentUserId();
      if (!userId) throw new Error('No user logged in');
      
      const { error } = await supabase
        .from('favorites')
        .insert({
          user_id: userId,
          recipe_id: recipeId,
          source: recipeId.startsWith('ck-') ? 'chefkoch' : 'local',
        });
      
      if (error && error.code !== '23505') throw error; // 23505 = duplicate key
      
      // Also save to localStorage as backup
      saveFavoriteSync(recipeId);
      return true;
    } catch (error) {
      console.error('Error saving favorite to Supabase:', error);
    }
  }
  
  // localStorage fallback
  return saveFavoriteSync(recipeId);
}

function saveFavoriteSync(recipeId: string): boolean {
  if (typeof window !== 'undefined') {
    const favorites = loadFavoritesSync();
    if (!favorites.includes(recipeId)) {
      favorites.push(recipeId);
      localStorage.setItem(STORAGE_KEYS.favorites, JSON.stringify(favorites));
    }
    return true;
  }
  return false;
}

export async function removeFavorite(recipeId: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  
  if (supabase && isSupabaseConfigured()) {
    try {
      const userId = await getCurrentUserId();
      if (!userId) throw new Error('No user logged in');
      
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', userId)
        .eq('recipe_id', recipeId);
      
      if (error) throw error;
      
      // Also remove from localStorage
      removeFavoriteSync(recipeId);
      return true;
    } catch (error) {
      console.error('Error removing favorite from Supabase:', error);
    }
  }
  
  // localStorage fallback
  return removeFavoriteSync(recipeId);
}

function removeFavoriteSync(recipeId: string): boolean {
  if (typeof window !== 'undefined') {
    const favorites = loadFavoritesSync();
    const index = favorites.indexOf(recipeId);
    if (index > -1) {
      favorites.splice(index, 1);
      localStorage.setItem(STORAGE_KEYS.favorites, JSON.stringify(favorites));
    }
    return true;
  }
  return false;
}

export async function loadFavorites(): Promise<string[]> {
  const supabase = getSupabaseClient();
  
  if (supabase && isSupabaseConfigured()) {
    try {
      const userId = await getCurrentUserId();
      if (!userId) throw new Error('No user logged in');
      
      const { data, error } = await supabase
        .from('favorites')
        .select('recipe_id')
        .eq('user_id', userId);
      
      if (error) throw error;
      
      return data?.map(f => f.recipe_id) || [];
    } catch (error) {
      console.error('Error loading favorites from Supabase:', error);
    }
  }
  
  // localStorage fallback
  return loadFavoritesSync();
}

function loadFavoritesSync(): string[] {
  if (typeof window !== 'undefined') {
    const data = localStorage.getItem(STORAGE_KEYS.favorites);
    return data ? JSON.parse(data) : [];
  }
  return [];
}

export function isFavorite(recipeId: string): boolean {
  return loadFavoritesSync().includes(recipeId);
}

// ============== Onboarding Progress Operations ==============

export function saveOnboardingProgress(step: number, data: Partial<UserProfile>): void {
  if (typeof window !== 'undefined') {
    const progress = {
      step,
      data,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEYS.onboardingProgress, JSON.stringify(progress));
  }
}

export function loadOnboardingProgress(): { step: number; data: Partial<UserProfile> } | null {
  if (typeof window !== 'undefined') {
    const data = localStorage.getItem(STORAGE_KEYS.onboardingProgress);
    if (data) {
      try {
        return JSON.parse(data);
      } catch {
        return null;
      }
    }
  }
  return null;
}

export function clearOnboardingProgress(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEYS.onboardingProgress);
  }
}

// ============== Clear All Data ==============

export async function clearAllData(): Promise<void> {
  const supabase = getSupabaseClient();
  
  if (supabase && isSupabaseConfigured()) {
    try {
      const userId = await getCurrentUserId();
      if (userId) {
        // Delete in order due to foreign key constraints
        await supabase.from('favorites').delete().eq('user_id', userId);
        await supabase.from('shopping_lists').delete().eq('user_id', userId);
        await supabase.from('meal_plans').delete().eq('user_id', userId);
        await supabase.from('profiles').delete().eq('id', userId);
      }
    } catch (error) {
      console.error('Error clearing Supabase data:', error);
    }
  }
  
  // Always clear localStorage
  if (typeof window !== 'undefined') {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
    localStorage.removeItem('fitinn_local_user_id');
  }
}

// ============== Migration Helper ==============

export async function migrateLocalStorageToSupabase(): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  
  const supabase = getSupabaseClient();
  if (!supabase) return false;
  
  try {
    const userId = await getCurrentUserId();
    if (!userId) return false;
    
    // Migrate profile
    const localProfile = localStorage.getItem(STORAGE_KEYS.profile);
    if (localProfile) {
      const profile = JSON.parse(localProfile);
      await saveProfile(profile);
    }
    
    // Migrate meal plans
    const localPlans = localStorage.getItem(STORAGE_KEYS.mealPlans);
    if (localPlans) {
      const plans = JSON.parse(localPlans);
      for (const [date, plan] of Object.entries(plans)) {
        await saveDayPlan(date, plan as DayPlan);
      }
    }
    
    // Migrate favorites
    const localFavorites = localStorage.getItem(STORAGE_KEYS.favorites);
    if (localFavorites) {
      const favorites = JSON.parse(localFavorites);
      for (const recipeId of favorites) {
        await saveFavorite(recipeId);
      }
    }
    
    console.log('Migration completed successfully');
    return true;
  } catch (error) {
    console.error('Migration error:', error);
    return false;
  }
}
