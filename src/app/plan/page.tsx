'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import BottomNav from '@/components/BottomNav';
import WaterTracker from '@/components/WaterTracker';
import { loadProfile, loadDayPlan, saveDayPlan, saveFavorite, removeFavorite, isFavorite } from '@/lib/storage';
import { generateDayPlan } from '@/lib/mealPlanGenerator';
import { calculateWaterGoal } from '@/lib/calculations';
import { UserProfile, DayPlan, Recipe, MealPlan } from '@/types';

function getDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

function getWeekNumber(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

const dayLabels = ['SO', 'MO', 'DI', 'MI', 'DO', 'FR', 'SA'];

const mealTypeLabels: Record<string, { label: string; fullLabel: string }> = {
  breakfast: { label: 'FRÜHSTÜCK', fullLabel: 'Frühstück' },
  morningSnack: { label: 'VORMITTAGSSNACK', fullLabel: 'Vormittagssnack' },
  lunch: { label: 'MITTAGESSEN', fullLabel: 'Mittagessen' },
  afternoonSnack: { label: 'NACHMITTAGSSNACK', fullLabel: 'Nachmittagssnack' },
  dinner: { label: 'ABENDESSEN', fullLabel: 'Abendessen' },
  lateSnack: { label: 'SPÄTSNACK', fullLabel: 'Spätsnack' },
};

// Food images from Unsplash for different meal types
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
    'https://images.unsplash.com/photo-1568702846914-96b305d2uj38?w=400&h=300&fit=crop',
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

function getDietTag(recipe: Recipe): string {
  if (recipe.dietaryFlags?.includes('vegan')) return 'Vegan';
  if (recipe.dietaryFlags?.includes('vegetarian')) return 'Vegetarisch';
  if (recipe.dietaryFlags?.includes('low-carb')) return 'Low Carb';
  if (recipe.dietaryFlags?.includes('gluten-free')) return 'Glutenfrei';
  if (recipe.tags?.includes('high-protein')) return 'High Protein';
  return 'Mischkost';
}

interface MealCardProps {
  meal: MealPlan;
  onToggleEaten: () => void;
  onSwap: (recipe: Recipe) => void;
  currentDate: Date;
}

function MealCard({ meal, onToggleEaten, onSwap, currentDate }: MealCardProps) {
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [favorite, setFavorite] = useState(() => isFavorite(meal.recipe.id));
  const { label } = mealTypeLabels[meal.type] || { label: meal.type.toUpperCase() };
  const recipe = meal.recipe;
  const imageUrl = getMealImage(recipe.category, recipe.id);
  
  const handleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (favorite) {
      removeFavorite(recipe.id);
    } else {
      saveFavorite(recipe.id);
    }
    setFavorite(!favorite);
  };

  return (
    <div className="min-w-[320px] max-w-[360px] snap-center">
      <div className={`meal-card bg-white rounded-2xl overflow-hidden ${meal.eaten ? 'opacity-60' : ''}`}>
        {/* Image Section */}
        <Link href={`/plan/recipe/${recipe.id}`}>
          <div className="relative h-48 bg-gray-100">
            <img 
              src={imageUrl} 
              alt={recipe.name}
              className="w-full h-full object-cover"
            />
            {/* Favorite Button */}
            <button
              onClick={handleFavorite}
              className="absolute top-3 right-3 p-2 rounded-full bg-white/90 shadow-sm hover:bg-white transition-colors"
            >
              <svg
                className={`w-5 h-5 ${favorite ? 'text-red-500 fill-current' : 'text-gray-400'}`}
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
            {/* Meal Type Label */}
            <div className="absolute bottom-3 left-3">
              <span className="px-2 py-1 bg-white/90 backdrop-blur-sm rounded text-[10px] font-bold tracking-wider text-gray-600">
                {label}
              </span>
            </div>
          </div>
        </Link>

        {/* Content Section */}
        <div className="p-4">
          <Link href={`/plan/recipe/${recipe.id}`}>
            <h3 className="font-semibold text-gray-900 text-lg mb-2 line-clamp-2">{recipe.name}</h3>
          </Link>
          
          {/* Info Line */}
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
            <span className="text-teal-600 font-medium">{getDietTag(recipe)}</span>
            <span>|</span>
            <span>{recipe.nutrition.calories} kcal</span>
            <span>|</span>
            <span>{recipe.totalTime} min</span>
          </div>

          {/* Ingredients Preview */}
          <div className="mb-4">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Zutaten</p>
            <p className="text-sm text-gray-600 line-clamp-2">
              {recipe.ingredients.slice(0, 4).map(i => i.name).join(', ')}
              {recipe.ingredients.length > 4 && ` +${recipe.ingredients.length - 4} mehr`}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => setShowAlternatives(true)}
              className="flex-1 py-2.5 px-3 rounded-lg border-2 border-gray-200 text-gray-600 text-sm font-medium hover:border-gray-300 transition-colors"
            >
              AUSLASSEN
            </button>
            <button
              onClick={() => setShowAlternatives(true)}
              className="flex-1 py-2.5 px-3 rounded-lg border-2 border-gray-200 text-gray-600 text-sm font-medium hover:border-gray-300 transition-colors"
            >
              WECHSELN
            </button>
            <button
              onClick={onToggleEaten}
              className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-medium transition-colors ${
                meal.eaten
                  ? 'bg-teal-600 text-white border-2 border-teal-600'
                  : 'border-2 border-teal-500 text-teal-600 hover:bg-teal-50'
              }`}
            >
              {meal.eaten ? 'GEWÄHLT ✓' : 'WÄHLEN'}
            </button>
          </div>
        </div>
      </div>

      {/* Alternatives Modal */}
      {showAlternatives && meal.alternatives && meal.alternatives.length > 0 && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-lg">Alternative Rezepte</h3>
              <button
                onClick={() => setShowAlternatives(false)}
                className="p-2 rounded-full hover:bg-gray-100"
              >
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 space-y-3 overflow-y-auto max-h-[60vh]">
              {meal.alternatives.map((alt) => (
                <button
                  key={alt.id}
                  onClick={() => {
                    onSwap(alt);
                    setShowAlternatives(false);
                  }}
                  className="w-full bg-gray-50 hover:bg-gray-100 rounded-xl p-4 flex items-center gap-4 text-left transition-colors"
                >
                  <img 
                    src={getMealImage(alt.category, alt.id)} 
                    alt={alt.name}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{alt.name}</p>
                    <p className="text-sm text-gray-500">
                      {alt.nutrition.calories} kcal • {alt.totalTime} min
                    </p>
                  </div>
                  <svg className="w-5 h-5 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PlanPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [weekDates, setWeekDates] = useState<Date[]>([]);
  const [dayPlan, setDayPlan] = useState<DayPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeMealIndex, setActiveMealIndex] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Initialize week dates
  useEffect(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1) + (selectedWeek - 1) * 7);
    
    const dates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      dates.push(date);
    }
    setWeekDates(dates);
    
    // Set current date to today if in week 1, otherwise first day of selected week
    if (selectedWeek === 1) {
      setCurrentDate(today);
    } else {
      setCurrentDate(dates[0]);
    }
  }, [selectedWeek]);

  useEffect(() => {
    const storedProfile = loadProfile();
    if (!storedProfile) {
      router.push('/onboarding');
      return;
    }
    setProfile(storedProfile);
  }, [router]);

  useEffect(() => {
    if (!profile) return;

    const dateStr = getDateString(currentDate);
    let plan = loadDayPlan(dateStr);

    if (!plan) {
      plan = generateDayPlan(dateStr, profile);
      saveDayPlan(dateStr, plan);
    }

    setDayPlan(plan);
    setIsLoading(false);
    setActiveMealIndex(0);
  }, [profile, currentDate]);

  const toggleMealEaten = (mealIndex: number) => {
    if (!dayPlan) return;

    const updatedMeals = [...dayPlan.meals];
    updatedMeals[mealIndex] = {
      ...updatedMeals[mealIndex],
      eaten: !updatedMeals[mealIndex].eaten,
    };

    const updatedPlan = { ...dayPlan, meals: updatedMeals };
    setDayPlan(updatedPlan);
    saveDayPlan(getDateString(currentDate), updatedPlan);
  };

  const swapMeal = (mealIndex: number, newRecipe: Recipe) => {
    if (!dayPlan) return;

    const updatedMeals = [...dayPlan.meals];
    const oldRecipe = updatedMeals[mealIndex].recipe;
    updatedMeals[mealIndex] = {
      ...updatedMeals[mealIndex],
      recipe: newRecipe,
      alternatives: [oldRecipe, ...updatedMeals[mealIndex].alternatives.filter(r => r.id !== newRecipe.id)].slice(0, 2),
    };

    const totalCalories = updatedMeals.reduce((sum, m) => sum + m.recipe.nutrition.calories, 0);
    const totalMacros = updatedMeals.reduce(
      (acc, m) => ({
        calories: acc.calories + m.recipe.nutrition.calories,
        protein: acc.protein + m.recipe.nutrition.protein,
        carbs: acc.carbs + m.recipe.nutrition.carbs,
        fat: acc.fat + m.recipe.nutrition.fat,
        fiber: acc.fiber + m.recipe.nutrition.fiber,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
    );

    const updatedPlan = { ...dayPlan, meals: updatedMeals, totalCalories, totalMacros };
    setDayPlan(updatedPlan);
    saveDayPlan(getDateString(currentDate), updatedPlan);
  };

  // Track scroll position for dot indicator
  const handleScroll = () => {
    if (scrollContainerRef.current && dayPlan) {
      const scrollLeft = scrollContainerRef.current.scrollLeft;
      const cardWidth = 340; // min-width + gap
      const index = Math.round(scrollLeft / cardWidth);
      setActiveMealIndex(Math.min(index, dayPlan.meals.length - 1));
    }
  };

  if (isLoading || !profile || !dayPlan) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const waterGoal = calculateWaterGoal(profile.weight, profile.sportsFrequency);
  const isToday = getDateString(currentDate) === getDateString(new Date());

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 bg-white z-10 shadow-sm">
        {/* Top Bar with Logo & Actions */}
        <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">FI</span>
            </div>
            <span className="font-semibold text-gray-900">FIT-INN Nutrition</span>
          </div>
          <div className="flex items-center gap-2">
            <Link 
              href="/einkaufsliste"
              className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-teal-600 transition-colors"
            >
              EINKAUFEN
            </Link>
            <button className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-teal-600 transition-colors">
              DRUCKEN
            </button>
          </div>
        </div>

        {/* Week Navigation */}
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="flex items-center justify-center gap-1">
            {[1, 2, 3].map((week) => (
              <button
                key={week}
                onClick={() => setSelectedWeek(week)}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  selectedWeek === week
                    ? 'text-teal-600 border-b-2 border-teal-600'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                WOCHE {week}
              </button>
            ))}
          </div>
        </div>

        {/* Day Selector */}
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            {weekDates.map((date, index) => {
              const isSelected = getDateString(date) === getDateString(currentDate);
              const isTodayDate = getDateString(date) === getDateString(new Date());
              const dayLabel = dayLabels[(index + 1) % 7]; // Monday = 1
              
              return (
                <button
                  key={index}
                  onClick={() => setCurrentDate(date)}
                  className={`flex flex-col items-center py-2 px-3 rounded-xl transition-all ${
                    isSelected
                      ? 'bg-teal-600 text-white'
                      : isTodayDate
                      ? 'bg-teal-50 text-teal-600'
                      : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  <span className="text-xs font-medium">{dayLabel}</span>
                  <span className={`text-lg font-semibold mt-0.5 ${isSelected ? 'text-white' : ''}`}>
                    {date.getDate()}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Date Info Bar */}
      <div className="px-4 py-3 bg-white border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">
              {currentDate.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            {isToday && <span className="text-xs text-teal-600 font-medium">Heute</span>}
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Tagesziel</p>
            <p className="font-semibold text-gray-900">{profile.targetCalories} kcal</p>
          </div>
        </div>
      </div>

      {/* Horizontal Meal Cards */}
      <div className="py-6">
        <div 
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex gap-4 px-4 overflow-x-auto hide-scrollbar snap-x scroll-smooth pb-4"
        >
          {dayPlan.meals.map((meal, index) => (
            <MealCard
              key={`${meal.type}-${meal.recipe.id}`}
              meal={meal}
              onToggleEaten={() => toggleMealEaten(index)}
              onSwap={(recipe) => swapMeal(index, recipe)}
              currentDate={currentDate}
            />
          ))}
        </div>

        {/* Dots Indicator */}
        <div className="flex items-center justify-center gap-2 mt-4">
          {dayPlan.meals.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                if (scrollContainerRef.current) {
                  scrollContainerRef.current.scrollTo({
                    left: index * 340,
                    behavior: 'smooth'
                  });
                }
              }}
              className={`w-2 h-2 rounded-full transition-all ${
                index === activeMealIndex ? 'w-6 bg-teal-600' : 'bg-gray-300'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Daily Summary */}
      <div className="px-4 mb-6">
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-3">Tagesübersicht</h3>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-teal-600">{dayPlan.totalCalories}</p>
              <p className="text-xs text-gray-500">kcal</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-500">{dayPlan.totalMacros.protein}g</p>
              <p className="text-xs text-gray-500">Protein</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-500">{dayPlan.totalMacros.carbs}g</p>
              <p className="text-xs text-gray-500">Kohlenh.</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-500">{dayPlan.totalMacros.fat}g</p>
              <p className="text-xs text-gray-500">Fett</p>
            </div>
          </div>
        </div>
      </div>

      {/* Water Tracker */}
      <div className="px-4 mb-6">
        <WaterTracker goal={waterGoal} date={getDateString(currentDate)} />
      </div>

      <BottomNav />
    </div>
  );
}
