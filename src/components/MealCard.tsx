'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Recipe } from '@/types';
import { saveFavorite, removeFavorite, isFavorite } from '@/lib/storage';

interface MealCardProps {
  type: string;
  time: string;
  recipe: Recipe;
  eaten?: boolean;
  onToggleEaten?: () => void;
  alternatives?: Recipe[];
  onSwap?: (recipe: Recipe) => void;
}

const mealTypeLabels: Record<string, { emoji: string; label: string }> = {
  breakfast: { emoji: '🌅', label: 'FRÜHSTÜCK' },
  morningSnack: { emoji: '🍎', label: 'SNACK' },
  lunch: { emoji: '🍽', label: 'MITTAGESSEN' },
  afternoonSnack: { emoji: '🍏', label: 'SNACK' },
  dinner: { emoji: '🌙', label: 'ABENDESSEN' },
  lateSnack: { emoji: '🌜', label: 'SPÄT-SNACK' },
};

export default function MealCard({
  type,
  time,
  recipe,
  eaten = false,
  onToggleEaten,
  alternatives = [],
  onSwap,
}: MealCardProps) {
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [favorite, setFavorite] = useState(() => isFavorite(recipe.id));
  const { emoji, label } = mealTypeLabels[type] || { emoji: '🍽', label: type.toUpperCase() };

  const handleFavorite = () => {
    if (favorite) {
      removeFavorite(recipe.id);
    } else {
      saveFavorite(recipe.id);
    }
    setFavorite(!favorite);
  };

  return (
    <div className="mb-4">
      {/* Meal Type Header */}
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-2">
          <span className="text-lg">{emoji}</span>
          <span className="text-xs font-semibold text-dark-400 tracking-wider">{label}</span>
          <span className="text-xs text-dark-500">({time})</span>
        </div>
        <span className="text-sm font-medium text-dark-300">{recipe.nutrition.calories} kcal</span>
      </div>

      {/* Recipe Card */}
      <div className={`glass rounded-2xl overflow-hidden transition-all ${eaten ? 'opacity-60' : ''}`}>
        <Link href={`/plan/recipe/${recipe.id}`} className="block">
          {/* Recipe Image Placeholder */}
          <div className="h-32 bg-gradient-to-br from-dark-700 to-dark-800 flex items-center justify-center">
            <span className="text-5xl">{emoji}</span>
          </div>

          {/* Recipe Info */}
          <div className="p-4">
            <h3 className="font-semibold text-lg mb-2">{recipe.name}</h3>
            
            {/* Macros */}
            <div className="flex gap-4 text-sm text-dark-300 mb-3">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-400"></span>
                P: {recipe.nutrition.protein}g
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
                K: {recipe.nutrition.carbs}g
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                F: {recipe.nutrition.fat}g
              </span>
            </div>

            {/* Tags */}
            <div className="flex items-center gap-2 text-xs text-dark-400">
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {recipe.totalTime} Min
              </span>
              {recipe.servings > 1 && (
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {recipe.servings} Port.
                </span>
              )}
            </div>
          </div>
        </Link>

        {/* Action Buttons */}
        <div className="flex border-t border-dark-700">
          {alternatives.length > 0 && (
            <button
              onClick={() => setShowAlternatives(!showAlternatives)}
              className="flex-1 py-3 text-sm text-dark-300 hover:text-primary-400 hover:bg-dark-800/50 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Tauschen
            </button>
          )}
          <button
            onClick={handleFavorite}
            className="flex-1 py-3 text-sm text-dark-300 hover:text-red-400 hover:bg-dark-800/50 transition-colors flex items-center justify-center gap-2"
          >
            <svg className={`w-4 h-4 ${favorite ? 'text-red-400 fill-current' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            Favorit
          </button>
          <button
            onClick={onToggleEaten}
            className={`flex-1 py-3 text-sm transition-colors flex items-center justify-center gap-2 ${
              eaten ? 'text-primary-400 bg-primary-500/10' : 'text-dark-300 hover:text-primary-400 hover:bg-dark-800/50'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {eaten ? 'Gegessen' : 'Fertig'}
          </button>
        </div>
      </div>

      {/* Alternatives Dropdown */}
      {showAlternatives && alternatives.length > 0 && (
        <div className="mt-2 space-y-2">
          <p className="text-xs text-dark-400 px-2">Alternative Rezepte:</p>
          {alternatives.map((alt) => (
            <button
              key={alt.id}
              onClick={() => {
                onSwap?.(alt);
                setShowAlternatives(false);
              }}
              className="w-full glass rounded-xl p-3 flex items-center justify-between hover:bg-dark-700/50 transition-colors"
            >
              <div className="text-left">
                <p className="font-medium text-sm">{alt.name}</p>
                <p className="text-xs text-dark-400">
                  {alt.nutrition.calories} kcal • {alt.totalTime} Min
                </p>
              </div>
              <svg className="w-5 h-5 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
