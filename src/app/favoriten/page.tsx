'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import BottomNav from '@/components/BottomNav';
import { getFavorites, removeFavorite as removeSupabaseFavorite } from '@/lib/supabase-data';
import { getRecipeById } from '@/lib/mealPlanGenerator';
import { Recipe } from '@/types';
import { useAuth } from '@/context/AuthContext';

export default function FavoritenPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadFavoriteRecipes = async () => {
    // Load favorites from Supabase (or localStorage if not authenticated)
    const favoriteIds = await getFavorites();
    const favoriteRecipes: Recipe[] = [];
    for (const id of favoriteIds) {
      const recipe = getRecipeById(id);
      if (recipe) favoriteRecipes.push(recipe);
    }
    setRecipes(favoriteRecipes);
    setIsLoading(false);
  };

  useEffect(() => {
    if (!authLoading) {
      loadFavoriteRecipes();
    }
  }, [authLoading, user]);

  const handleRemove = async (recipeId: string) => {
    // Remove from Supabase (and localStorage)
    await removeSupabaseFavorite(recipeId);
    setRecipes(prev => prev.filter(r => r.id !== recipeId));
  };

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const categoryEmoji: Record<string, string> = {
    breakfast: '🥣',
    lunch: '🥗',
    dinner: '🍲',
    snack: '🥜',
  };

  const categoryColor: Record<string, string> = {
    breakfast: 'bg-amber-50',
    lunch: 'bg-emerald-50',
    dinner: 'bg-indigo-50',
    snack: 'bg-orange-50',
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24 lg:pb-8">
      {/* Header */}
      <div className="sticky top-0 bg-white z-10 px-4 lg:px-8 py-4 border-b border-gray-100 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Link href="/profil" className="p-2 rounded-xl hover:bg-gray-100 text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <span className="text-2xl">❤️</span>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">Meine Favoriten</h1>
            <p className="text-sm text-gray-500">
              {recipes.length} Rezept{recipes.length !== 1 ? 'e' : ''}
              {user && <span className="text-teal-600 ml-1">• Synchronisiert</span>}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 lg:px-6 py-4 lg:py-6">
        {recipes.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <span className="text-6xl block mb-4">❤️</span>
            <p className="font-medium text-lg text-gray-600">Noch keine Favoriten</p>
            <p className="text-sm mt-2">Markiere Rezepte mit ❤️ um sie hier zu speichern</p>
            <Link href="/plan" className="inline-block mt-6 px-6 py-3 rounded-xl bg-teal-600 text-white font-medium hover:bg-teal-700 transition-colors">
              Zum Wochenplan
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recipes.map((recipe) => (
              <div key={recipe.id} className="bg-white rounded-2xl overflow-hidden shadow-sm">
                <Link href={`/plan/recipe/${recipe.id}`}>
                  <div className={`flex items-center justify-between px-4 py-3 ${categoryColor[recipe.category] || 'bg-gray-50'}`}>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{categoryEmoji[recipe.category] || '🍽'}</span>
                      <div>
                        <span className="text-sm font-semibold text-gray-800">{recipe.nutrition.calories} kcal</span>
                        <span className="text-xs text-gray-500 ml-2">⏱ {recipe.totalTime} min</span>
                      </div>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 text-base mb-2 line-clamp-2 hover:text-teal-600 transition-colors">
                      {recipe.name}
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>P: {recipe.nutrition.protein}g</span>
                      <span>K: {recipe.nutrition.carbs}g</span>
                      <span>F: {recipe.nutrition.fat}g</span>
                    </div>
                  </div>
                </Link>
                <div className="px-4 pb-4">
                  <button
                    onClick={() => handleRemove(recipe.id)}
                    className="w-full py-2 rounded-lg border border-red-200 text-red-500 text-sm font-medium hover:bg-red-50 transition-colors"
                  >
                    ❤️ Entfernen
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
