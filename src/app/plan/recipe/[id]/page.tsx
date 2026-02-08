'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getRecipeById } from '@/lib/mealPlanGenerator';
import { saveFavorite, removeFavorite, isFavorite } from '@/lib/storage';
import { Recipe } from '@/types';
import BottomNav from '@/components/BottomNav';

// Food images from Unsplash for different meal types
const mealImages: Record<string, string[]> = {
  breakfast: [
    'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1494597564530-871f2b93ac55?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=800&h=600&fit=crop',
  ],
  lunch: [
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800&h=600&fit=crop',
  ],
  dinner: [
    'https://images.unsplash.com/photo-1432139509613-5c4255815697?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=800&h=600&fit=crop',
  ],
  snack: [
    'https://images.unsplash.com/photo-1568702846914-96b305d2uj38?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1587132137056-bfbf0166836e?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=800&h=600&fit=crop',
  ],
};

function getMealImage(category: string, id: string): string {
  const images = mealImages[category] || mealImages.snack;
  const index = parseInt(id) % images.length;
  return images[index];
}

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
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const imageUrl = getMealImage(recipe.category, recipe.id);

  return (
    <div className={`min-h-screen pb-24 ${cookMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-lg mx-auto bg-white min-h-screen shadow-lg">
      {/* Header Image */}
      <div className="relative h-44 bg-gray-100">
        <img 
          src={imageUrl} 
          alt={recipe.name}
          className="w-full h-full object-cover"
        />
        
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="absolute top-3 left-4 p-2 rounded-full bg-white shadow-md"
        >
          <svg className="w-6 h-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Favorite Button */}
        <button
          onClick={handleFavorite}
          className="absolute top-3 right-4 p-2 rounded-full bg-white shadow-md"
        >
          <svg
            className={`w-6 h-6 ${favorite ? 'text-red-500 fill-current' : 'text-gray-400'}`}
            fill={favorite ? 'currentColor' : 'none'}
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
      <div className={`px-4 py-4 -mt-4 rounded-t-2xl relative ${cookMode ? 'bg-gray-900 text-white' : 'bg-white'}`}>
        {/* Title & Tags */}
        <h1 className={`text-xl font-bold mb-1 ${cookMode ? 'text-white' : 'text-gray-900'}`}>{recipe.name}</h1>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {recipe.tags.slice(0, 4).map(tag => (
            <span 
              key={tag} 
              className={`px-3 py-1 rounded-full text-xs ${
                cookMode 
                  ? 'bg-gray-800 text-gray-300' 
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Quick Info */}
        <div className={`flex gap-3 mb-4 text-sm ${cookMode ? 'text-gray-400' : 'text-gray-500'}`}>
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
        <div className={`rounded-2xl p-3 mb-4 ${cookMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
          <h3 className={`font-semibold mb-3 ${cookMode ? 'text-white' : 'text-gray-900'}`}>Nährwerte pro Portion</h3>
          <div className="grid grid-cols-4 gap-3 text-center">
            <div>
              <p className="text-xl font-bold text-teal-500">{recipe.nutrition.calories}</p>
              <p className={`text-xs ${cookMode ? 'text-gray-400' : 'text-gray-500'}`}>kcal</p>
            </div>
            <div>
              <p className="text-xl font-bold text-red-500">{recipe.nutrition.protein}g</p>
              <p className={`text-xs ${cookMode ? 'text-gray-400' : 'text-gray-500'}`}>Protein</p>
            </div>
            <div>
              <p className="text-xl font-bold text-yellow-500">{recipe.nutrition.carbs}g</p>
              <p className={`text-xs ${cookMode ? 'text-gray-400' : 'text-gray-500'}`}>Carbs</p>
            </div>
            <div>
              <p className="text-xl font-bold text-blue-500">{recipe.nutrition.fat}g</p>
              <p className={`text-xs ${cookMode ? 'text-gray-400' : 'text-gray-500'}`}>Fett</p>
            </div>
          </div>
        </div>

        {/* Portion Adjuster */}
        <div className={`rounded-2xl p-3 mb-4 ${cookMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
          <div className="flex items-center justify-between">
            <span className={`font-semibold ${cookMode ? 'text-white' : 'text-gray-900'}`}>Portionen</span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setServings(Math.max(1, servings - 1))}
                className={`w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold ${
                  cookMode ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-700'
                }`}
              >
                −
              </button>
              <span className={`text-xl font-bold w-8 text-center ${cookMode ? 'text-white' : 'text-gray-900'}`}>{servings}</span>
              <button
                onClick={() => setServings(servings + 1)}
                className="w-10 h-10 rounded-full bg-teal-500 text-white flex items-center justify-center text-xl font-bold"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Ingredients */}
        <div className="mb-4">
          <h3 className={`font-semibold mb-3 ${cookMode ? 'text-white' : 'text-gray-900'}`}>Zutaten</h3>
          <div className={`rounded-2xl divide-y ${cookMode ? 'bg-gray-800 divide-gray-700' : 'bg-gray-50 divide-gray-200'}`}>
            {recipe.ingredients.map((ing, i) => (
              <div key={i} className="flex justify-between p-3">
                <span className={cookMode ? 'text-gray-300' : 'text-gray-700'}>{ing.name}</span>
                <span className={cookMode ? 'text-gray-400' : 'text-gray-500'}>
                  {adjustAmount(ing.amount)} {ing.unit}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Instructions */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className={`font-semibold ${cookMode ? 'text-white' : 'text-gray-900'}`}>Zubereitung</h3>
            <button
              onClick={() => setCookMode(!cookMode)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                cookMode
                  ? 'bg-teal-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cookMode ? '👨‍🍳 Kochmodus AN' : '👨‍🍳 Kochmodus'}
            </button>
          </div>
          <div className="space-y-4">
            {recipe.instructions.map((step, i) => (
              <div
                key={i}
                className={`rounded-xl p-3 flex gap-3 ${
                  cookMode ? 'bg-gray-800 text-lg' : 'bg-gray-50'
                }`}
              >
                <span className="w-8 h-8 rounded-full bg-teal-500/20 text-teal-500 flex items-center justify-center font-bold shrink-0">
                  {i + 1}
                </span>
                <p className={cookMode ? 'text-gray-200' : 'text-gray-700'}>{step}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Allergens */}
        {recipe.allergens.length > 0 && (
          <div className={`rounded-2xl p-3 ${cookMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
            <h3 className={`font-semibold mb-2 ${cookMode ? 'text-white' : 'text-gray-900'}`}>Allergene</h3>
            <div className="flex flex-wrap gap-2">
              {recipe.allergens.map(allergen => (
                <span key={allergen} className="px-3 py-1 rounded-full bg-red-100 text-red-600 text-xs">
                  {allergen}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      </div>
      <BottomNav />
    </div>
  );
}
