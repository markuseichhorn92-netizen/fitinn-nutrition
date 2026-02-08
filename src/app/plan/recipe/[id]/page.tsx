'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getRecipeById } from '@/lib/mealPlanGenerator';
import { saveFavorite, removeFavorite, isFavorite } from '@/lib/storage';
import { Recipe } from '@/types';
import BottomNav from '@/components/BottomNav';

export default function RecipeDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [favorite, setFavorite] = useState(false);
  const [servings, setServings] = useState(1);
  const [cookMode, setCookMode] = useState(false);

  useEffect(() => {
    const id = params.id as string;
    const foundRecipe = getRecipeById(id);
    if (foundRecipe) {
      setRecipe(foundRecipe);
      setServings(foundRecipe.servings);
      setFavorite(isFavorite(id));
    }
  }, [params.id]);

  const handleFavorite = () => {
    if (!recipe) return;
    if (favorite) {
      removeFavorite(recipe.id);
    } else {
      saveFavorite(recipe.id);
    }
    setFavorite(!favorite);
  };

  const adjustAmount = (amount: number): string => {
    const adjusted = (amount / (recipe?.servings || 1)) * servings;
    return adjusted % 1 === 0 ? adjusted.toString() : adjusted.toFixed(1);
  };

  if (!recipe) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const categoryEmojis: Record<string, string> = {
    breakfast: '🌅',
    lunch: '🍽',
    dinner: '🌙',
    snack: '🍎',
  };

  return (
    <div className={`min-h-screen pb-24 ${cookMode ? 'bg-dark-950' : ''}`}>
      {/* Header Image */}
      <div className="relative h-64 bg-gradient-to-br from-dark-700 to-dark-800 flex items-center justify-center">
        <span className="text-8xl">{categoryEmojis[recipe.category] || '🍽'}</span>
        
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 p-2 rounded-full bg-dark-900/80 backdrop-blur-lg"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Favorite Button */}
        <button
          onClick={handleFavorite}
          className="absolute top-4 right-4 p-2 rounded-full bg-dark-900/80 backdrop-blur-lg"
        >
          <svg
            className={`w-6 h-6 ${favorite ? 'text-red-400 fill-current' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="px-6 py-6 -mt-6 bg-dark-900 rounded-t-3xl relative">
        {/* Title & Tags */}
        <h1 className="text-2xl font-bold mb-2">{recipe.name}</h1>
        <div className="flex flex-wrap gap-2 mb-4">
          {recipe.tags.slice(0, 4).map(tag => (
            <span key={tag} className="px-3 py-1 rounded-full bg-dark-700 text-xs text-dark-300">
              {tag}
            </span>
          ))}
        </div>

        {/* Quick Info */}
        <div className="flex gap-4 mb-6 text-sm text-dark-400">
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {recipe.totalTime} Min
          </span>
          <span>•</span>
          <span className="capitalize">{recipe.difficulty === 'easy' ? 'Einfach' : recipe.difficulty === 'medium' ? 'Mittel' : 'Aufwändig'}</span>
          <span>•</span>
          <span>{recipe.servings} Portion{recipe.servings > 1 ? 'en' : ''}</span>
        </div>

        {/* Nutrition Facts */}
        <div className="glass rounded-2xl p-4 mb-6">
          <h3 className="font-semibold mb-3">Nährwerte pro Portion</h3>
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-primary-400">{recipe.nutrition.calories}</p>
              <p className="text-xs text-dark-400">kcal</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-400">{recipe.nutrition.protein}g</p>
              <p className="text-xs text-dark-400">Protein</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-400">{recipe.nutrition.carbs}g</p>
              <p className="text-xs text-dark-400">Carbs</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-400">{recipe.nutrition.fat}g</p>
              <p className="text-xs text-dark-400">Fett</p>
            </div>
          </div>
        </div>

        {/* Portion Adjuster */}
        <div className="glass rounded-2xl p-4 mb-6">
          <div className="flex items-center justify-between">
            <span className="font-semibold">Portionen</span>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setServings(Math.max(1, servings - 1))}
                className="w-10 h-10 rounded-full bg-dark-700 flex items-center justify-center text-xl font-bold"
              >
                −
              </button>
              <span className="text-2xl font-bold w-8 text-center">{servings}</span>
              <button
                onClick={() => setServings(servings + 1)}
                className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center text-xl font-bold"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Ingredients */}
        <div className="mb-6">
          <h3 className="font-semibold mb-3">Zutaten</h3>
          <div className="glass rounded-2xl divide-y divide-dark-700">
            {recipe.ingredients.map((ing, i) => (
              <div key={i} className="flex justify-between p-3">
                <span>{ing.name}</span>
                <span className="text-dark-400">
                  {adjustAmount(ing.amount)} {ing.unit}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Instructions */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Zubereitung</h3>
            <button
              onClick={() => setCookMode(!cookMode)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                cookMode
                  ? 'bg-primary-500 text-white'
                  : 'bg-dark-700 text-dark-300'
              }`}
            >
              {cookMode ? '👨‍🍳 Kochmodus AN' : '👨‍🍳 Kochmodus'}
            </button>
          </div>
          <div className="space-y-4">
            {recipe.instructions.map((step, i) => (
              <div
                key={i}
                className={`glass rounded-xl p-4 flex gap-4 ${
                  cookMode ? 'text-lg' : ''
                }`}
              >
                <span className="w-8 h-8 rounded-full bg-primary-500/20 text-primary-400 flex items-center justify-center font-bold shrink-0">
                  {i + 1}
                </span>
                <p className="text-dark-200">{step}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Allergens */}
        {recipe.allergens.length > 0 && (
          <div className="glass rounded-2xl p-4">
            <h3 className="font-semibold mb-2">Allergene</h3>
            <div className="flex flex-wrap gap-2">
              {recipe.allergens.map(allergen => (
                <span key={allergen} className="px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-xs">
                  {allergen}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
