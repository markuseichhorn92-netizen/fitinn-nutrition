'use client';

import { getSupabaseClient, isSupabaseConfigured } from './supabase';
import { UserProfile, DayPlan } from '@/types';
import * as localStorage from './storage';

// Helper to check if user is authenticated
async function getAuthenticatedUser() {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// =============================================================================
// USER PROFILE
// =============================================================================

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  // Always save to localStorage as backup
  localStorage.saveProfile(profile);
  
  const user = await getAuthenticatedUser();
  if (!user) return;
  
  const supabase = getSupabaseClient();
  if (!supabase) return;
  
  try {
    const { error } = await supabase
      .from('user_profiles')
      .upsert({
        id: user.id,
        name: profile.gender === 'male' ? 'Herr' : profile.gender === 'female' ? 'Frau' : 'Person',
        age: profile.age,
        gender: profile.gender,
        height_cm: profile.height,
        weight_kg: profile.weight,
        activity_level: profile.occupation,
        goal: profile.goal,
        target_calories: profile.targetCalories,
        target_protein: profile.macros?.protein,
        target_carbs: profile.macros?.carbs,
        target_fat: profile.macros?.fat,
        profile_data: profile,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'id'
      });
    
    if (error) {
      console.error('Error saving profile to Supabase:', error);
    }
  } catch (err) {
    console.error('Error saving profile:', err);
  }
}

export async function loadUserProfile(): Promise<UserProfile | null> {
  const user = await getAuthenticatedUser();
  
  if (!user) {
    // Not authenticated, use localStorage
    return localStorage.loadProfile();
  }
  
  const supabase = getSupabaseClient();
  if (!supabase) {
    return localStorage.loadProfile();
  }
  
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('profile_data')
      .eq('id', user.id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        // No profile found in Supabase, try localStorage
        return localStorage.loadProfile();
      }
      console.error('Error loading profile from Supabase:', error);
      return localStorage.loadProfile();
    }
    
    if (data?.profile_data) {
      // Also save to localStorage for offline access
      localStorage.saveProfile(data.profile_data as UserProfile);
      return data.profile_data as UserProfile;
    }
    
    return localStorage.loadProfile();
  } catch (err) {
    console.error('Error loading profile:', err);
    return localStorage.loadProfile();
  }
}

// =============================================================================
// MEAL PLANS
// =============================================================================

function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

function getDayIndex(date: Date): number {
  const day = date.getDay();
  return day === 0 ? 6 : day - 1; // Monday = 0, Sunday = 6
}

export async function saveDayPlan(dateStr: string, plan: DayPlan): Promise<void> {
  // Always save to localStorage as backup
  localStorage.saveDayPlan(dateStr, plan);
  
  const user = await getAuthenticatedUser();
  if (!user) return;
  
  const supabase = getSupabaseClient();
  if (!supabase) return;
  
  try {
    const date = new Date(dateStr);
    const weekStart = getWeekStart(date);
    const dayIndex = getDayIndex(date);
    
    const { error } = await supabase
      .from('meal_plans')
      .upsert({
        user_id: user.id,
        week_start: weekStart,
        day_index: dayIndex,
        plan_data: plan,
      }, {
        onConflict: 'user_id,week_start,day_index'
      });
    
    if (error) {
      console.error('Error saving meal plan to Supabase:', error);
    }
  } catch (err) {
    console.error('Error saving meal plan:', err);
  }
}

export async function loadDayPlan(dateStr: string): Promise<DayPlan | null> {
  const user = await getAuthenticatedUser();
  
  if (!user) {
    return localStorage.loadDayPlan(dateStr);
  }
  
  const supabase = getSupabaseClient();
  if (!supabase) {
    return localStorage.loadDayPlan(dateStr);
  }
  
  try {
    const date = new Date(dateStr);
    const weekStart = getWeekStart(date);
    const dayIndex = getDayIndex(date);
    
    const { data, error } = await supabase
      .from('meal_plans')
      .select('plan_data')
      .eq('user_id', user.id)
      .eq('week_start', weekStart)
      .eq('day_index', dayIndex)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return localStorage.loadDayPlan(dateStr);
      }
      console.error('Error loading meal plan from Supabase:', error);
      return localStorage.loadDayPlan(dateStr);
    }
    
    if (data?.plan_data) {
      localStorage.saveDayPlan(dateStr, data.plan_data as DayPlan);
      return data.plan_data as DayPlan;
    }
    
    return localStorage.loadDayPlan(dateStr);
  } catch (err) {
    console.error('Error loading meal plan:', err);
    return localStorage.loadDayPlan(dateStr);
  }
}

export async function loadWeekPlans(weekStartDate: string): Promise<Record<string, DayPlan>> {
  const user = await getAuthenticatedUser();
  const result: Record<string, DayPlan> = {};
  
  if (!user) {
    // Load from localStorage for the week
    const startDate = new Date(weekStartDate);
    for (let i = 0; i < 7; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const plan = localStorage.loadDayPlan(dateStr);
      if (plan) result[dateStr] = plan;
    }
    return result;
  }
  
  const supabase = getSupabaseClient();
  if (!supabase) {
    return result;
  }
  
  try {
    const { data, error } = await supabase
      .from('meal_plans')
      .select('day_index, plan_data')
      .eq('user_id', user.id)
      .eq('week_start', weekStartDate);
    
    if (error) {
      console.error('Error loading week plans from Supabase:', error);
      return result;
    }
    
    if (data) {
      const startDate = new Date(weekStartDate);
      for (const row of data) {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + row.day_index);
        const dateStr = d.toISOString().split('T')[0];
        result[dateStr] = row.plan_data as DayPlan;
      }
    }
    
    return result;
  } catch (err) {
    console.error('Error loading week plans:', err);
    return result;
  }
}

// =============================================================================
// FAVORITES
// =============================================================================

export async function addFavorite(recipeId: string): Promise<void> {
  // Always save to localStorage
  localStorage.saveFavorite(recipeId);
  
  const user = await getAuthenticatedUser();
  if (!user) return;
  
  const supabase = getSupabaseClient();
  if (!supabase) return;
  
  try {
    const { error } = await supabase
      .from('favorites')
      .upsert({
        user_id: user.id,
        recipe_id: recipeId,
      }, {
        onConflict: 'user_id,recipe_id'
      });
    
    if (error) {
      console.error('Error adding favorite to Supabase:', error);
    }
  } catch (err) {
    console.error('Error adding favorite:', err);
  }
}

export async function removeFavorite(recipeId: string): Promise<void> {
  // Always remove from localStorage
  localStorage.removeFavorite(recipeId);
  
  const user = await getAuthenticatedUser();
  if (!user) return;
  
  const supabase = getSupabaseClient();
  if (!supabase) return;
  
  try {
    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', user.id)
      .eq('recipe_id', recipeId);
    
    if (error) {
      console.error('Error removing favorite from Supabase:', error);
    }
  } catch (err) {
    console.error('Error removing favorite:', err);
  }
}

export async function getFavorites(): Promise<string[]> {
  const user = await getAuthenticatedUser();
  
  if (!user) {
    return localStorage.loadFavorites();
  }
  
  const supabase = getSupabaseClient();
  if (!supabase) {
    return localStorage.loadFavorites();
  }
  
  try {
    const { data, error } = await supabase
      .from('favorites')
      .select('recipe_id')
      .eq('user_id', user.id);
    
    if (error) {
      console.error('Error loading favorites from Supabase:', error);
      return localStorage.loadFavorites();
    }
    
    const favorites = data?.map(row => row.recipe_id) || [];
    
    // Sync to localStorage
    const localFavorites = localStorage.loadFavorites();
    for (const id of favorites) {
      if (!localFavorites.includes(id)) {
        localStorage.saveFavorite(id);
      }
    }
    
    return favorites;
  } catch (err) {
    console.error('Error loading favorites:', err);
    return localStorage.loadFavorites();
  }
}

export async function isFavorite(recipeId: string): Promise<boolean> {
  const favorites = await getFavorites();
  return favorites.includes(recipeId);
}

// =============================================================================
// WATER TRACKING
// =============================================================================

export async function saveWaterIntake(dateStr: string, glasses: number, targetGlasses: number = 8): Promise<void> {
  // Always save to localStorage
  localStorage.saveWaterIntake(dateStr, glasses);
  
  const user = await getAuthenticatedUser();
  if (!user) return;
  
  const supabase = getSupabaseClient();
  if (!supabase) return;
  
  try {
    const { error } = await supabase
      .from('water_tracking')
      .upsert({
        user_id: user.id,
        date: dateStr,
        glasses: glasses,
        target_glasses: targetGlasses,
      }, {
        onConflict: 'user_id,date'
      });
    
    if (error) {
      console.error('Error saving water intake to Supabase:', error);
    }
  } catch (err) {
    console.error('Error saving water intake:', err);
  }
}

export async function getWaterIntake(dateStr: string): Promise<{ glasses: number; target: number }> {
  const user = await getAuthenticatedUser();
  
  if (!user) {
    return {
      glasses: localStorage.loadWaterIntake(dateStr),
      target: 8,
    };
  }
  
  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      glasses: localStorage.loadWaterIntake(dateStr),
      target: 8,
    };
  }
  
  try {
    const { data, error } = await supabase
      .from('water_tracking')
      .select('glasses, target_glasses')
      .eq('user_id', user.id)
      .eq('date', dateStr)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return {
          glasses: localStorage.loadWaterIntake(dateStr),
          target: 8,
        };
      }
      console.error('Error loading water intake from Supabase:', error);
      return {
        glasses: localStorage.loadWaterIntake(dateStr),
        target: 8,
      };
    }
    
    return {
      glasses: data?.glasses || 0,
      target: data?.target_glasses || 8,
    };
  } catch (err) {
    console.error('Error loading water intake:', err);
    return {
      glasses: localStorage.loadWaterIntake(dateStr),
      target: 8,
    };
  }
}

// =============================================================================
// SCANNED EXTRAS (Barcode Products)
// =============================================================================

export async function saveScannedExtras(dateStr: string, items: any[]): Promise<void> {
  // Always save to localStorage
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(`fitinn_scanned_${dateStr}`, JSON.stringify(items));
  }
  
  const user = await getAuthenticatedUser();
  if (!user) return;
  
  const supabase = getSupabaseClient();
  if (!supabase) return;
  
  try {
    const { error } = await supabase
      .from('scanned_extras')
      .upsert({
        user_id: user.id,
        date: dateStr,
        items: items,
      }, {
        onConflict: 'user_id,date'
      });
    
    if (error) {
      console.error('Error saving scanned extras to Supabase:', error);
    }
  } catch (err) {
    console.error('Error saving scanned extras:', err);
  }
}

export async function getScannedExtras(dateStr: string): Promise<any[]> {
  const user = await getAuthenticatedUser();
  
  // Try localStorage first
  let localItems: any[] = [];
  if (typeof window !== 'undefined') {
    try {
      const stored = window.localStorage.getItem(`fitinn_scanned_${dateStr}`);
      if (stored) localItems = JSON.parse(stored);
    } catch (e) {}
  }
  
  if (!user) {
    return localItems;
  }
  
  const supabase = getSupabaseClient();
  if (!supabase) {
    return localItems;
  }
  
  try {
    const { data, error } = await supabase
      .from('scanned_extras')
      .select('items')
      .eq('user_id', user.id)
      .eq('date', dateStr)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return localItems;
      }
      console.error('Error loading scanned extras from Supabase:', error);
      return localItems;
    }
    
    return data?.items || localItems;
  } catch (err) {
    console.error('Error loading scanned extras:', err);
    return localItems;
  }
}

// =============================================================================
// STREAKS & ACHIEVEMENTS
// =============================================================================

export async function updateStreak(): Promise<{ current: number; longest: number; total: number }> {
  const defaultStreak = { current: 0, longest: 0, total: 0 };
  
  const user = await getAuthenticatedUser();
  if (!user) return defaultStreak;
  
  const supabase = getSupabaseClient();
  if (!supabase) return defaultStreak;
  
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Get current streak data
    const { data: existing } = await supabase
      .from('user_streaks')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    let currentStreak = 1;
    let longestStreak = existing?.longest_streak || 0;
    let totalDays = (existing?.total_days_logged || 0) + 1;
    
    if (existing?.last_active_date) {
      const lastDate = new Date(existing.last_active_date);
      const todayDate = new Date(today);
      const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) {
        // Same day, don't increment
        return {
          current: existing.current_streak,
          longest: existing.longest_streak,
          total: existing.total_days_logged,
        };
      } else if (diffDays === 1) {
        // Consecutive day
        currentStreak = (existing.current_streak || 0) + 1;
      }
      // else: streak broken, starts at 1
    }
    
    longestStreak = Math.max(longestStreak, currentStreak);
    
    // Upsert streak
    const { error } = await supabase
      .from('user_streaks')
      .upsert({
        user_id: user.id,
        current_streak: currentStreak,
        longest_streak: longestStreak,
        last_active_date: today,
        total_days_logged: totalDays,
      }, {
        onConflict: 'user_id'
      });
    
    if (error) {
      console.error('Error updating streak:', error);
    }
    
    return { current: currentStreak, longest: longestStreak, total: totalDays };
  } catch (err) {
    console.error('Error updating streak:', err);
    return defaultStreak;
  }
}

export async function getStreak(): Promise<{ current: number; longest: number; total: number }> {
  const defaultStreak = { current: 0, longest: 0, total: 0 };
  
  const user = await getAuthenticatedUser();
  if (!user) return defaultStreak;
  
  const supabase = getSupabaseClient();
  if (!supabase) return defaultStreak;
  
  try {
    const { data, error } = await supabase
      .from('user_streaks')
      .select('current_streak, longest_streak, total_days_logged')
      .eq('user_id', user.id)
      .single();
    
    if (error) {
      return defaultStreak;
    }
    
    return {
      current: data?.current_streak || 0,
      longest: data?.longest_streak || 0,
      total: data?.total_days_logged || 0,
    };
  } catch (err) {
    return defaultStreak;
  }
}

// =============================================================================
// SYNC HELPERS
// =============================================================================

// Sync localStorage data to Supabase after login
export async function syncLocalDataToSupabase(): Promise<void> {
  const user = await getAuthenticatedUser();
  if (!user) return;
  
  console.log('Syncing local data to Supabase...');
  
  // Sync profile
  const localProfile = localStorage.loadProfile();
  if (localProfile) {
    await saveUserProfile(localProfile);
  }
  
  // Sync favorites
  const localFavorites = localStorage.loadFavorites();
  for (const recipeId of localFavorites) {
    await addFavorite(recipeId);
  }
  
  // Sync recent meal plans (last 14 days)
  const today = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const plan = localStorage.loadDayPlan(dateStr);
    if (plan) {
      await saveDayPlan(dateStr, plan);
    }
  }
  
  // Update streak
  await updateStreak();
  
  console.log('Sync complete!');
}

// Sync Supabase data to localStorage (for offline access)
export async function syncSupabaseToLocal(): Promise<void> {
  const user = await getAuthenticatedUser();
  if (!user) return;
  
  console.log('Syncing Supabase data to local...');
  
  // Load profile from Supabase
  await loadUserProfile();
  
  // Load favorites
  await getFavorites();
  
  // Load recent meal plans
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    await loadDayPlan(dateStr);
  }
  
  console.log('Local sync complete!');
}
