'use client';

import { UserProfile, DayPlan, ScannedItem } from '@/types';

const PROFILE_KEY = 'fitinn_user_profile';
const PLAN_KEY = 'fitinn_meal_plan';
const WATER_KEY = 'fitinn_water_intake';
const FAVORITES_KEY = 'fitinn_favorites';
const SCANNED_ITEMS_KEY = 'fitinn_scanned_items';

export function saveProfile(profile: UserProfile): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  }
}

export function loadProfile(): UserProfile | null {
  if (typeof window !== 'undefined') {
    const data = localStorage.getItem(PROFILE_KEY);
    return data ? JSON.parse(data) : null;
  }
  return null;
}

export function saveDayPlan(date: string, plan: DayPlan): void {
  if (typeof window !== 'undefined') {
    const plans = loadAllPlans();
    plans[date] = plan;
    localStorage.setItem(PLAN_KEY, JSON.stringify(plans));
  }
}

export function loadDayPlan(date: string): DayPlan | null {
  if (typeof window !== 'undefined') {
    const plans = loadAllPlans();
    return plans[date] || null;
  }
  return null;
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

export function saveWaterIntake(date: string, amount: number): void {
  if (typeof window !== 'undefined') {
    const water = loadAllWaterIntake();
    water[date] = amount;
    localStorage.setItem(WATER_KEY, JSON.stringify(water));
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

export function saveFavorite(recipeId: string): void {
  if (typeof window !== 'undefined') {
    const favorites = loadFavorites();
    if (!favorites.includes(recipeId)) {
      favorites.push(recipeId);
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    }
  }
}

export function removeFavorite(recipeId: string): void {
  if (typeof window !== 'undefined') {
    const favorites = loadFavorites();
    const index = favorites.indexOf(recipeId);
    if (index > -1) {
      favorites.splice(index, 1);
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
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

export function clearAllData(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(PROFILE_KEY);
    localStorage.removeItem(PLAN_KEY);
    localStorage.removeItem(WATER_KEY);
    localStorage.removeItem(FAVORITES_KEY);
    localStorage.removeItem(SCANNED_ITEMS_KEY);
  }
}

export function hasCompletedOnboarding(): boolean {
  return loadProfile() !== null;
}

// Scanned Items Storage
export function loadScannedItems(date: string): ScannedItem[] {
  if (typeof window !== 'undefined') {
    const data = localStorage.getItem(SCANNED_ITEMS_KEY);
    const allItems: Record<string, ScannedItem[]> = data ? JSON.parse(data) : {};
    return allItems[date] || [];
  }
  return [];
}

export function saveScannedItem(date: string, item: ScannedItem): void {
  if (typeof window !== 'undefined') {
    const data = localStorage.getItem(SCANNED_ITEMS_KEY);
    const allItems: Record<string, ScannedItem[]> = data ? JSON.parse(data) : {};
    if (!allItems[date]) {
      allItems[date] = [];
    }
    allItems[date].push(item);
    localStorage.setItem(SCANNED_ITEMS_KEY, JSON.stringify(allItems));
  }
}

export function removeScannedItem(date: string, itemId: string): void {
  if (typeof window !== 'undefined') {
    const data = localStorage.getItem(SCANNED_ITEMS_KEY);
    const allItems: Record<string, ScannedItem[]> = data ? JSON.parse(data) : {};
    if (allItems[date]) {
      allItems[date] = allItems[date].filter(item => item.id !== itemId);
      localStorage.setItem(SCANNED_ITEMS_KEY, JSON.stringify(allItems));
    }
  }
}

export function updateScannedItem(date: string, itemId: string, updates: Partial<ScannedItem>): void {
  if (typeof window !== 'undefined') {
    const data = localStorage.getItem(SCANNED_ITEMS_KEY);
    const allItems: Record<string, ScannedItem[]> = data ? JSON.parse(data) : {};
    if (allItems[date]) {
      allItems[date] = allItems[date].map(item => 
        item.id === itemId ? { ...item, ...updates } : item
      );
      localStorage.setItem(SCANNED_ITEMS_KEY, JSON.stringify(allItems));
    }
  }
}

export function getScannedItemsTotal(date: string): { calories: number; protein: number; carbs: number; fat: number } {
  const items = loadScannedItems(date);
  return items.reduce(
    (acc, item) => ({
      calories: acc.calories + item.nutrition.calories,
      protein: acc.protein + item.nutrition.protein,
      carbs: acc.carbs + item.nutrition.carbs,
      fat: acc.fat + item.nutrition.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}
