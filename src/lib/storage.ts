'use client';

import { UserProfile, DayPlan, ScannedItem } from '@/types';

const PROFILE_KEY = 'fitinn_user_profile';
const PLAN_KEY = 'fitinn_meal_plan';
const WATER_KEY = 'fitinn_water_intake';
const FAVORITES_KEY = 'fitinn_favorites';
const SCANNED_ITEMS_KEY = 'fitinn_scanned_items';

// Import Supabase sync functions dynamically to avoid circular deps
let supabaseData: any = null;
async function getSupabaseData() {
  if (!supabaseData) {
    supabaseData = await import('./supabase-data');
  }
  return supabaseData;
}

// =============================================================================
// PROFILE
// =============================================================================

export function saveProfile(profile: UserProfile): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    // Also sync to Supabase (async, fire and forget)
    getSupabaseData().then(sb => sb.saveUserProfile(profile)).catch(console.error);
  }
}

export function loadProfile(): UserProfile | null {
  if (typeof window !== 'undefined') {
    const data = localStorage.getItem(PROFILE_KEY);
    return data ? JSON.parse(data) : null;
  }
  return null;
}

// =============================================================================
// DAY PLANS
// =============================================================================

export function saveDayPlan(date: string, plan: DayPlan): void {
  if (typeof window !== 'undefined') {
    const plans = loadAllPlans();
    plans[date] = plan;
    localStorage.setItem(PLAN_KEY, JSON.stringify(plans));
    // Also sync to Supabase
    getSupabaseData().then(sb => sb.saveDayPlan(date, plan)).catch(console.error);
  }
}

export function loadDayPlan(date: string): DayPlan | null {
  if (typeof window !== 'undefined') {
    const plans = loadAllPlans();
    return plans[date] || null;
  }
  return null;
}

// Async version that checks Supabase first
export async function loadDayPlanAsync(date: string): Promise<DayPlan | null> {
  try {
    const sb = await getSupabaseData();
    const cloudPlan = await sb.loadDayPlan(date);
    if (cloudPlan) {
      // Update local cache
      const plans = loadAllPlans();
      plans[date] = cloudPlan;
      localStorage.setItem(PLAN_KEY, JSON.stringify(plans));
      return cloudPlan;
    }
  } catch (e) {
    console.error('Error loading from cloud:', e);
  }
  // Fallback to local
  return loadDayPlan(date);
}

export function loadAllPlans(): Record<string, DayPlan> {
  if (typeof window !== 'undefined') {
    const data = localStorage.getItem(PLAN_KEY);
    return data ? JSON.parse(data) : {};
  }
  return {};
}

export function clearAllPlans(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(PLAN_KEY);
  }
}

// =============================================================================
// WATER INTAKE
// =============================================================================

export function saveWaterIntake(date: string, amount: number): void {
  if (typeof window !== 'undefined') {
    const water = loadAllWaterIntake();
    water[date] = amount;
    localStorage.setItem(WATER_KEY, JSON.stringify(water));
    // Also sync to Supabase
    getSupabaseData().then(sb => sb.saveWaterIntake(date, amount, 8)).catch(console.error);
  }
}

export function loadWaterIntake(date: string): number {
  if (typeof window !== 'undefined') {
    const water = loadAllWaterIntake();
    return water[date] || 0;
  }
  return 0;
}

export function loadAllWaterIntake(): Record<string, number> {
  if (typeof window !== 'undefined') {
    const data = localStorage.getItem(WATER_KEY);
    return data ? JSON.parse(data) : {};
  }
  return {};
}

// =============================================================================
// FAVORITES
// =============================================================================

export function saveFavorite(recipeId: string): void {
  if (typeof window !== 'undefined') {
    const favorites = loadFavorites();
    if (!favorites.includes(recipeId)) {
      favorites.push(recipeId);
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
      // Also sync to Supabase
      getSupabaseData().then(sb => sb.addFavorite(recipeId)).catch(console.error);
    }
  }
}

export function removeFavorite(recipeId: string): void {
  if (typeof window !== 'undefined') {
    const favorites = loadFavorites();
    const index = favorites.indexOf(recipeId);
    if (index !== -1) {
      favorites.splice(index, 1);
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
      // Also sync to Supabase
      getSupabaseData().then(sb => sb.removeFavorite(recipeId)).catch(console.error);
    }
  }
}

export function loadFavorites(): string[] {
  if (typeof window !== 'undefined') {
    const data = localStorage.getItem(FAVORITES_KEY);
    return data ? JSON.parse(data) : [];
  }
  return [];
}

export function isFavorite(recipeId: string): boolean {
  return loadFavorites().includes(recipeId);
}

// =============================================================================
// SCANNED ITEMS
// =============================================================================

export function saveScannedItem(date: string, item: ScannedItem): void {
  if (typeof window !== 'undefined') {
    const items = loadScannedItems(date);
    items.push(item);
    const key = `${SCANNED_ITEMS_KEY}_${date}`;
    localStorage.setItem(key, JSON.stringify(items));
    // Also sync to Supabase
    getSupabaseData().then(sb => sb.saveScannedExtras(date, items)).catch(console.error);
  }
}

export function loadScannedItems(date: string): ScannedItem[] {
  if (typeof window !== 'undefined') {
    const key = `${SCANNED_ITEMS_KEY}_${date}`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  }
  return [];
}

export function removeScannedItem(date: string, itemId: string): void {
  if (typeof window !== 'undefined') {
    const items = loadScannedItems(date).filter(item => item.id !== itemId);
    const key = `${SCANNED_ITEMS_KEY}_${date}`;
    localStorage.setItem(key, JSON.stringify(items));
    // Also sync to Supabase
    getSupabaseData().then(sb => sb.saveScannedExtras(date, items)).catch(console.error);
  }
}

export function getScannedItemsTotal(date: string): { calories: number; protein: number; carbs: number; fat: number } {
  const items = loadScannedItems(date);
  return items.reduce(
    (acc, item) => ({
      calories: acc.calories + (item.nutrition?.calories || 0),
      protein: acc.protein + (item.nutrition?.protein || 0),
      carbs: acc.carbs + (item.nutrition?.carbs || 0),
      fat: acc.fat + (item.nutrition?.fat || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

// =============================================================================
// CLEAR ALL DATA
// =============================================================================

export function clearAllData(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(PROFILE_KEY);
    localStorage.removeItem(PLAN_KEY);
    localStorage.removeItem(WATER_KEY);
    localStorage.removeItem(FAVORITES_KEY);
    // Clear scanned items for all dates
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(SCANNED_ITEMS_KEY)) {
        localStorage.removeItem(key);
      }
    });
  }
}

// =============================================================================
// INITIAL SYNC (call on app start when user is logged in)
// =============================================================================

export async function syncFromCloud(): Promise<void> {
  try {
    const sb = await getSupabaseData();
    
    // Sync profile
    const cloudProfile = await sb.loadUserProfile();
    if (cloudProfile) {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(cloudProfile));
    }
    
    // Sync favorites
    const cloudFavorites = await sb.getFavorites();
    if (cloudFavorites.length > 0) {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(cloudFavorites));
    }
    
    // Sync recent meal plans (last 7 days)
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const cloudPlan = await sb.loadDayPlan(dateStr);
      if (cloudPlan) {
        const plans = loadAllPlans();
        plans[dateStr] = cloudPlan;
        localStorage.setItem(PLAN_KEY, JSON.stringify(plans));
      }
    }
    
    console.log('Cloud sync complete!');
  } catch (e) {
    console.error('Error syncing from cloud:', e);
  }
}

export async function syncToCloud(): Promise<void> {
  try {
    const sb = await getSupabaseData();
    await sb.syncLocalDataToSupabase();
    console.log('Sync to cloud complete!');
  } catch (e) {
    console.error('Error syncing to cloud:', e);
  }
}
