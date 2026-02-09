'use client';

import { useState, useEffect, useMemo } from 'react';
import { Recipe, UserProfile } from '@/types';
import { getAllRecipes } from '@/lib/mealPlanGenerator';
import { loadProfile } from '@/lib/storage';

// Map meal types to recipe categories
const mealTypeToCategory: Record<string, string[]> = {
  breakfast: ['breakfast'],
  morningSnack: ['snack'],
  lunch: ['lunch'],
  afternoonSnack: ['snack'],
  dinner: ['dinner'],
  lateSnack: ['snack'],
};

const mealLabels: Record<string, string> = {
  breakfast: 'Frühstück',
  morningSnack: 'Snack',
  lunch: 'Mittagessen',
  afternoonSnack: 'Snack',
  dinner: 'Abendessen',
  lateSnack: 'Spätsnack',
};

interface RecipeSwapPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (recipe: Recipe) => void;
  mealType: string;
  currentRecipeId?: string;
}

export default function RecipeSwapPanel({ isOpen, onClose, onSelect, mealType, currentRecipeId }: RecipeSwapPanelProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'quick' | 'low'>('all');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  
  useEffect(() => {
    const p = loadProfile();
    if (p) setProfile(p);
  }, []);

  // Reset search when panel opens
  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setFilter('all');
    }
  }, [isOpen]);

  const allRecipes = useMemo(() => getAllRecipes(), []);

  const categories = mealTypeToCategory[mealType] || ['lunch', 'dinner'];

  const filteredRecipes = useMemo(() => {
    let recipes = allRecipes.filter(r => categories.includes(r.category));

    // Exclude current recipe
    if (currentRecipeId) {
      recipes = recipes.filter(r => r.id !== currentRecipeId);
    }

    // Apply user profile filters
    if (profile) {
      recipes = recipes.filter(recipe => {
        if (profile.allergies?.length) {
          if (recipe.allergens?.some(a => profile.allergies.includes(a))) return false;
        }
        if (profile.excludedFoods?.length) {
          if (recipe.ingredients?.some(ing =>
            profile.excludedFoods.some(ex => ing.name.toLowerCase().includes(ex.toLowerCase()))
          )) return false;
        }
        if (profile.dietType === 'vegetarian' && !recipe.dietaryFlags?.includes('vegetarian') && !recipe.dietaryFlags?.includes('vegan')) {
          return false;
        }
        if (profile.dietType === 'vegan' && !recipe.dietaryFlags?.includes('vegan')) {
          return false;
        }
        return true;
      });
    }

    // Apply quick filters
    if (filter === 'quick') recipes = recipes.filter(r => r.totalTime <= 15);
    if (filter === 'low') recipes = recipes.filter(r => r.nutrition.calories <= 400);

    // Apply search
    if (search.trim()) {
      const q = search.toLowerCase();
      recipes = recipes.filter(r => 
        r.name.toLowerCase().includes(q) || 
        r.ingredients?.some(i => i.name.toLowerCase().includes(q))
      );
    }

    return recipes.slice(0, 20); // Limit for performance
  }, [allRecipes, categories, currentRecipeId, profile, filter, search]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />
      
      {/* Bottom Sheet */}
      <div className="fixed inset-x-0 bottom-0 z-50 animate-slide-up">
        <div className="bg-white rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col">
          
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
          </div>
          
          {/* Header */}
          <div className="px-5 pb-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Rezept wechseln</h2>
                <p className="text-sm text-gray-500">{mealLabels[mealType] || 'Rezepte'}</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full bg-gray-100 active:bg-gray-200 touch-manipulation"
              >
                <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Search */}
            <div className="relative mt-4">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl">🔍</span>
              <input
                type="text"
                placeholder="Rezept suchen..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-gray-100 text-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                autoFocus
              />
            </div>
            
            {/* Quick Filters */}
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-full font-medium transition-colors touch-manipulation ${
                  filter === 'all' ? 'bg-teal-500 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                Alle
              </button>
              <button
                onClick={() => setFilter('quick')}
                className={`px-4 py-2 rounded-full font-medium transition-colors touch-manipulation ${
                  filter === 'quick' ? 'bg-teal-500 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                ⚡ Schnell
              </button>
              <button
                onClick={() => setFilter('low')}
                className={`px-4 py-2 rounded-full font-medium transition-colors touch-manipulation ${
                  filter === 'low' ? 'bg-teal-500 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                🔥 Kalorienarm
              </button>
            </div>
          </div>

          {/* Recipe List */}
          <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 space-y-3 safe-area-bottom">
            {filteredRecipes.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <span className="text-5xl block mb-4">😕</span>
                <p className="font-medium text-lg">Keine Rezepte gefunden</p>
                <p className="text-sm mt-1">Versuch andere Suchbegriffe</p>
              </div>
            ) : (
              filteredRecipes.map((recipe) => (
                <button
                  key={recipe.id}
                  onClick={() => {
                    onSelect(recipe);
                    onClose();
                  }}
                  className="w-full bg-gray-50 rounded-2xl p-4 flex items-center gap-4 text-left active:scale-[0.98] active:bg-gray-100 transition-all touch-manipulation"
                >
                  {/* Recipe Icon */}
                  <div className="w-14 h-14 rounded-xl bg-white shadow-sm flex items-center justify-center text-3xl shrink-0">
                    {recipe.category === 'breakfast' ? '🥣' :
                     recipe.category === 'lunch' ? '🥗' :
                     recipe.category === 'dinner' ? '🍲' : '🍎'}
                  </div>
                  
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{recipe.name}</p>
                    <div className="flex items-center gap-3 mt-1 text-sm">
                      <span className="text-orange-600 font-semibold">{recipe.nutrition.calories} kcal</span>
                      <span className="text-gray-400">•</span>
                      <span className="text-gray-500">{recipe.totalTime} min</span>
                    </div>
                  </div>
                  
                  {/* Arrow */}
                  <div className="text-gray-300">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              ))
            )}
            
            {/* Bottom spacer for safe area */}
            <div className="h-4" />
          </div>
        </div>
      </div>
    </>
  );
}
