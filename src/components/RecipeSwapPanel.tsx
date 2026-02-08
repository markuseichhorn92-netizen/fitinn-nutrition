'use client';

import { useState, useEffect, useMemo } from 'react';
import { Recipe, UserProfile } from '@/types';
import { getAllRecipes } from '@/lib/mealPlanGenerator';
import { searchRecipes } from '@/lib/chefkoch';
import { loadProfile } from '@/lib/storage';

const mealImages: Record<string, string[]> = {
  breakfast: [
    'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1494597564530-871f2b93ac55?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=400&h=300&fit=crop',
  ],
  lunch: [
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&h=300&fit=crop',
  ],
  dinner: [
    'https://images.unsplash.com/photo-1432139509613-5c4255815697?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=400&h=300&fit=crop',
  ],
  snack: [
    'https://images.unsplash.com/photo-1587132137056-bfbf0166836e?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=400&h=300&fit=crop',
  ],
};

function getMealImage(category: string, id: string): string {
  const images = mealImages[category] || mealImages.snack;
  const index = parseInt(id) % images.length;
  return images[index];
}

// Map meal types to recipe categories
const mealTypeToCategory: Record<string, string[]> = {
  breakfast: ['breakfast'],
  morningSnack: ['snack'],
  lunch: ['lunch'],
  afternoonSnack: ['snack'],
  dinner: ['dinner'],
  lateSnack: ['snack'],
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
  const [filter, setFilter] = useState<'all' | 'quick' | 'lowcal' | 'highprotein' | 'vegetarian' | 'vegan'>('all');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [apiResults, setApiResults] = useState<Recipe[]>([]);

  useEffect(() => {
    const p = loadProfile();
    if (p) setProfile(p);
  }, []);

  const allRecipes = useMemo(() => getAllRecipes(), []);

  // Search Chefkoch API when user types a search query
  useEffect(() => {
    if (!search.trim() || search.trim().length < 3) {
      setApiResults([]);
      return;
    }
    const timer = setTimeout(() => {
      searchRecipes(search.trim(), 10).then(results => {
        setApiResults(results);
      }).catch(() => {});
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const categories = mealTypeToCategory[mealType] || ['lunch', 'dinner'];

  const filteredRecipes = useMemo(() => {
    // Combine local recipes with API search results
    const combined = search.trim().length >= 3 && apiResults.length > 0
      ? [...apiResults, ...allRecipes]
      : allRecipes;
    // Deduplicate by id
    const deduped = Array.from(new Map(combined.map(r => [r.id, r])).values());
    
    let recipes = search.trim().length >= 3 && apiResults.length > 0
      ? deduped  // Show all categories when searching via API
      : deduped.filter(r => categories.includes(r.category));

    // Exclude current recipe
    if (currentRecipeId) {
      recipes = recipes.filter(r => r.id !== currentRecipeId);
    }

    // Apply user profile filters (allergies, excluded foods)
    if (profile) {
      recipes = recipes.filter(recipe => {
        // Check allergies
        if (profile.allergies && profile.allergies.length > 0) {
          const hasAllergen = recipe.allergens?.some(a => 
            profile.allergies.includes(a)
          );
          if (hasAllergen) return false;
        }
        // Check excluded foods
        if (profile.excludedFoods && profile.excludedFoods.length > 0) {
          const hasExcluded = recipe.ingredients?.some(ing =>
            profile.excludedFoods.some(ex => ing.name.toLowerCase().includes(ex.toLowerCase()))
          );
          if (hasExcluded) return false;
        }
        // Check diet type
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
    if (filter === 'lowcal') recipes = recipes.filter(r => r.nutrition.calories <= 400);
    if (filter === 'highprotein') recipes = recipes.filter(r => r.nutrition.protein >= 25);
    if (filter === 'vegetarian') recipes = recipes.filter(r => r.dietaryFlags?.includes('vegetarian') || r.dietaryFlags?.includes('vegan'));
    if (filter === 'vegan') recipes = recipes.filter(r => r.dietaryFlags?.includes('vegan'));

    // Apply search
    if (search.trim()) {
      const q = search.toLowerCase();
      recipes = recipes.filter(r => 
        r.name.toLowerCase().includes(q) || 
        r.tags?.some(t => t.toLowerCase().includes(q)) ||
        r.ingredients?.some(i => i.name.toLowerCase().includes(q))
      );
    }

    // Sort by rating/relevance
    recipes.sort((a, b) => (b.nutrition?.calories || 0) - (a.nutrition?.calories || 0));

    return recipes;
  }, [allRecipes, categories, currentRecipeId, profile, filter, search]);

  const mealLabel = mealType === 'breakfast' ? 'Frühstück' 
    : mealType === 'morningSnack' ? 'Vormittagssnack'
    : mealType === 'lunch' ? 'Mittagessen'
    : mealType === 'afternoonSnack' ? 'Nachmittagssnack'
    : mealType === 'dinner' ? 'Abendessen'
    : mealType === 'lateSnack' ? 'Spätsnack'
    : 'Rezepte';

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />
      
      {/* Slide-over Panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] bg-white shadow-2xl flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Rezept wechseln</h2>
            <p className="text-sm text-gray-500">{mealLabel} • {filteredRecipes.length} Rezepte verfügbar</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-100 shrink-0">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Rezept oder Zutat suchen..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-100 border-0 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-teal-500 focus:bg-white transition-colors"
            />
          </div>
          
          {/* Quick Filters */}
          <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
            {[
              { key: 'all', label: 'Alle' },
              { key: 'quick', label: '⚡ Schnell' },
              { key: 'lowcal', label: '🔥 Kalorienarm' },
              { key: 'highprotein', label: '💪 High Protein' },
              { key: 'vegetarian', label: '🥬 Vegetarisch' },
              { key: 'vegan', label: '🌱 Vegan' },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key as typeof filter)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  filter === f.key
                    ? 'bg-teal-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Recipe List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredRecipes.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <svg className="w-12 h-12 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="font-medium">Keine Rezepte gefunden</p>
              <p className="text-sm mt-1">Versuche andere Filter oder Suchbegriffe</p>
            </div>
          ) : (
            filteredRecipes.map((recipe) => (
              <button
                key={recipe.id}
                onClick={() => {
                  onSelect(recipe);
                  onClose();
                }}
                className="w-full bg-gray-50 hover:bg-gray-100 rounded-2xl p-3 flex gap-4 text-left transition-all hover:shadow-md group"
              >
                <img
                  src={recipe.image && recipe.image.startsWith('http') ? recipe.image : getMealImage(recipe.category, recipe.id)}
                  alt={recipe.name}
                  className="w-20 h-20 rounded-xl object-cover shrink-0 group-hover:scale-105 transition-transform"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{recipe.name}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {recipe.dietaryFlags?.slice(0, 2).map(flag => (
                      <span key={flag} className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-600 text-[10px] font-medium">
                        {flag}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
                    <span className="font-semibold text-teal-600">{recipe.nutrition.calories} kcal</span>
                    <span>P: {recipe.nutrition.protein}g</span>
                    <span>⏱ {recipe.totalTime} min</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1 truncate">
                    {recipe.ingredients?.slice(0, 4).map(i => i.name).join(', ')}
                    {(recipe.ingredients?.length || 0) > 4 ? ` +${(recipe.ingredients?.length || 0) - 4} mehr` : ''}
                  </p>
                </div>
                <div className="flex items-center shrink-0">
                  <svg className="w-5 h-5 text-gray-300 group-hover:text-teal-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in-right {
          animation: slideInRight 0.3s ease-out;
        }
      `}</style>
    </>
  );
}
