'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import BottomNav from '@/components/BottomNav';
import { loadFavorites, removeFavorite } from '@/lib/storage';
import { getRecipeById } from '@/lib/mealPlanGenerator';
import { Recipe } from '@/types';

export default function FavoritenPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const favoriteIds = loadFavorites();
    const favoriteRecipes: Recipe[] = [];
    for (const id of favoriteIds) {
      const recipe = getRecipeById(id);
      if (recipe) favoriteRecipes.push(recipe);
    }
    setRecipes(favoriteRecipes);
    setIsLoading(false);
  }, []);

  const handleRemove = (recipeId: string) => {
    removeFavorite(recipeId);
    setRecipes(prev => prev.filter(r => r.id !== recipeId));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <div className="animate-spin w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full mb-4" />
        <p className="text-gray-500">Favoriten werden geladen...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 bg-white z-10 px-5 py-4 border-b border-gray-100 shadow-sm safe-area-top">
        <div className="flex items-center gap-3">
          <span className="text-3xl">❤️</span>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Meine Favoriten</h1>
            <p className="text-sm text-gray-500">
              {recipes.length} {recipes.length === 1 ? 'Rezept' : 'Rezepte'}
            </p>
          </div>
        </div>
      </div>

      <div className="px-5 py-5">
        {recipes.length === 0 ? (
          <div className="text-center py-16">
            <span className="text-6xl block mb-4">❤️</span>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Noch keine Favoriten</h2>
            <p className="text-gray-500 mb-6">
              Tippe auf das Herz bei einem Rezept,<br />um es hier zu speichern
            </p>
            <Link 
              href="/plan" 
              className="inline-block px-6 py-4 bg-teal-600 text-white rounded-2xl font-semibold active:scale-[0.98] transition-transform touch-manipulation"
            >
              Zum Tagesplan →
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {recipes.map((recipe) => (
              <div key={recipe.id} className="bg-white rounded-2xl overflow-hidden shadow-sm">
                <Link href={`/plan/recipe/${recipe.id}`} className="block p-4">
                  <div className="flex items-center gap-4">
                    {/* Icon */}
                    <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center text-3xl shrink-0">
                      {recipe.category === 'breakfast' ? '🥣' :
                       recipe.category === 'lunch' ? '🥗' :
                       recipe.category === 'dinner' ? '🍲' : '🍎'}
                    </div>
                    
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{recipe.name}</h3>
                      <div className="flex items-center gap-3 mt-1 text-sm">
                        <span className="text-orange-600 font-semibold">{recipe.nutrition.calories} kcal</span>
                        <span className="text-gray-400">•</span>
                        <span className="text-gray-500">{recipe.totalTime} min</span>
                      </div>
                    </div>
                  </div>
                </Link>
                
                {/* Remove Button */}
                <div className="px-4 pb-4">
                  <button
                    onClick={() => handleRemove(recipe.id)}
                    className="w-full py-3 rounded-xl border-2 border-red-200 text-red-500 font-semibold active:bg-red-50 transition-colors touch-manipulation"
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
