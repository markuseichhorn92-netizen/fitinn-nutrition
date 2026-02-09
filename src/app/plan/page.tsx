'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import BottomNav from '@/components/BottomNav';
import WaterTracker from '@/components/WaterTracker';
import { loadProfile, loadDayPlan, saveDayPlan, loadAllPlans, saveFavorite, removeFavorite, isFavorite } from '@/lib/storage';
import { generateDayPlan, scaleRecipe, generateShoppingList, initializeRecipes, isApiRecipesLoaded } from '@/lib/mealPlanGenerator';
import { calculateWaterGoal } from '@/lib/calculations';
import { UserProfile, DayPlan, Recipe, MealPlan } from '@/types';
import RecipeSwapPanel from '@/components/RecipeSwapPanel';
import PlanTutorial from '@/components/PlanTutorial';
import ExtrasSection from '@/components/ExtrasSection';

function getDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

const dayLabels = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const monthNames = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

// Meal type info with emoji and German labels
const mealTypeInfo: Record<string, { label: string; emoji: string; color: string; bgColor: string }> = {
  breakfast: { label: 'Frühstück', emoji: '🌅', color: 'text-amber-700', bgColor: 'bg-amber-100' },
  morningSnack: { label: 'Snack', emoji: '🍎', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  lunch: { label: 'Mittagessen', emoji: '☀️', color: 'text-emerald-700', bgColor: 'bg-emerald-100' },
  afternoonSnack: { label: 'Snack', emoji: '🍌', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  dinner: { label: 'Abendessen', emoji: '🌙', color: 'text-indigo-700', bgColor: 'bg-indigo-100' },
  lateSnack: { label: 'Spät-Snack', emoji: '🌜', color: 'text-purple-700', bgColor: 'bg-purple-100' },
};

// Generate 3 weeks of dates
function generateWeekDates(): Date[] {
  const today = new Date();
  const dayOfWeek = today.getDay();
  // Start from last Monday
  const startMonday = new Date(today);
  startMonday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  
  const dates: Date[] = [];
  for (let i = 0; i < 21; i++) { // 3 weeks
    const date = new Date(startMonday);
    date.setDate(startMonday.getDate() + i);
    dates.push(date);
  }
  return dates;
}

// Mobile Meal Card with prominent meal type
function MobileMealCard({ 
  meal, 
  onToggleEaten, 
  onOpenSwapPanel 
}: {
  meal: MealPlan;
  onToggleEaten: () => void;
  onOpenSwapPanel: () => void;
}) {
  const [favorite, setFavorite] = useState(() => isFavorite(meal.recipe.id));
  const mealInfo = mealTypeInfo[meal.type] || { label: meal.type, emoji: '🍽️', color: 'text-gray-700', bgColor: 'bg-gray-100' };
  const recipe = meal.recipe;
  
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
    <div className="min-w-[300px] max-w-[320px] snap-center shrink-0">
      <div className={`bg-white rounded-2xl overflow-hidden shadow-sm ${meal.eaten ? 'opacity-60' : ''}`}>
        
        {/* PROMINENT Meal Type Header */}
        <div data-tutorial="meal-header" className={`${mealInfo.bgColor} px-4 py-3 flex items-center gap-3`}>
          <span className="text-3xl">{mealInfo.emoji}</span>
          <div>
            <p className={`font-bold text-lg ${mealInfo.color}`}>{mealInfo.label}</p>
            <p className="text-sm text-gray-600">{recipe.nutrition.calories} kcal • {recipe.totalTime} min</p>
          </div>
          <button
            onClick={handleFavorite}
            className="ml-auto p-2 rounded-full hover:bg-white/50 transition-colors touch-manipulation"
          >
            <svg
              className={`w-6 h-6 ${favorite ? 'text-red-500 fill-current' : 'text-gray-400'}`}
              fill={favorite ? 'currentColor' : 'none'}
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>
        </div>

        {/* Recipe Content */}
        <div className="p-4">
          <Link href={`/plan/recipe/${recipe.id}`} data-tutorial="recipe-name">
            <h3 className="font-semibold text-gray-900 text-lg mb-2 line-clamp-2 active:text-teal-600">{recipe.name}</h3>
          </Link>
          
          {/* Ingredients Preview */}
          <p className="text-sm text-gray-500 mb-4 line-clamp-2">
            {recipe.ingredients.slice(0, 3).map(i => i.name).join(', ')}
            {recipe.ingredients.length > 3 && ` +${recipe.ingredients.length - 3}`}
          </p>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={onOpenSwapPanel}
              data-tutorial="swap-btn"
              className="flex-1 py-3 px-3 rounded-xl border border-gray-200 text-gray-700 font-medium text-sm hover:border-gray-300 transition-colors touch-manipulation"
            >
              🔄 Wechseln
            </button>
            <button
              onClick={onToggleEaten}
              data-tutorial="eaten-btn"
              className={`flex-1 py-3 px-3 rounded-xl font-medium text-sm transition-colors touch-manipulation ${
                meal.eaten
                  ? 'bg-teal-600 text-white'
                  : 'border border-teal-500 text-teal-600 hover:bg-teal-50'
              }`}
            >
              {meal.eaten ? '✓ Gegessen' : 'Gegessen?'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Desktop Meal Card
function DesktopMealCard({ 
  meal, 
  onToggleEaten, 
  onOpenSwapPanel 
}: {
  meal: MealPlan;
  onToggleEaten: () => void;
  onOpenSwapPanel: () => void;
}) {
  const [favorite, setFavorite] = useState(() => isFavorite(meal.recipe.id));
  const mealInfo = mealTypeInfo[meal.type] || { label: meal.type, emoji: '🍽️', color: 'text-gray-700', bgColor: 'bg-gray-100' };
  const recipe = meal.recipe;
  
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
    <div className={`bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col h-full ${meal.eaten ? 'opacity-60' : ''}`}>
      {/* Meal Type Header */}
      <div className={`${mealInfo.bgColor} px-4 py-3 flex items-center gap-3`}>
        <span className="text-2xl">{mealInfo.emoji}</span>
        <span className={`font-bold ${mealInfo.color}`}>{mealInfo.label}</span>
        <button
          onClick={handleFavorite}
          className="ml-auto p-1.5 rounded-full hover:bg-white/50 transition-colors"
        >
          <svg
            className={`w-5 h-5 ${favorite ? 'text-red-500 fill-current' : 'text-gray-400'}`}
            fill={favorite ? 'currentColor' : 'none'}
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col">
        <Link href={`/plan/recipe/${recipe.id}`}>
          <h3 className="font-semibold text-gray-900 text-base mb-2 line-clamp-2 hover:text-teal-600 transition-colors">
            {recipe.name}
          </h3>
        </Link>
        
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
          <span className="font-semibold text-teal-600">{recipe.nutrition.calories} kcal</span>
          <span>•</span>
          <span>{recipe.totalTime} min</span>
        </div>

        <p className="text-sm text-gray-500 mb-4 line-clamp-2 flex-1">
          {recipe.ingredients.slice(0, 4).map(i => i.name).join(', ')}
        </p>

        <div className="flex gap-2">
          <button
            onClick={onOpenSwapPanel}
            className="flex-1 py-2 px-2 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:border-gray-300 transition-colors"
          >
            Wechseln
          </button>
          <button
            onClick={onToggleEaten}
            className={`flex-1 py-2 px-2 rounded-lg text-sm font-medium transition-colors ${
              meal.eaten
                ? 'bg-teal-600 text-white'
                : 'border border-teal-500 text-teal-600 hover:bg-teal-50'
            }`}
          >
            {meal.eaten ? '✓ Gegessen' : 'Wählen'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PlanPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [allDates, setAllDates] = useState<Date[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dayPlan, setDayPlan] = useState<DayPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeMealIndex, setActiveMealIndex] = useState(0);
  const [swapPanel, setSwapPanel] = useState<{ open: boolean; mealIndex: number; mealType: string }>({ open: false, mealIndex: -1, mealType: '' });
  const mealScrollRef = useRef<HTMLDivElement>(null);
  const calendarScrollRef = useRef<HTMLDivElement>(null);

  // Initialize dates
  useEffect(() => {
    setAllDates(generateWeekDates());
    setCurrentDate(new Date());
  }, []);

  // Scroll calendar to show today
  useEffect(() => {
    if (calendarScrollRef.current && allDates.length > 0) {
      const todayIndex = allDates.findIndex(d => getDateString(d) === getDateString(new Date()));
      if (todayIndex >= 0) {
        const scrollPos = Math.max(0, (todayIndex - 2) * 56); // 56px per day button
        calendarScrollRef.current.scrollTo({ left: scrollPos, behavior: 'auto' });
      }
    }
  }, [allDates]);

  // Load profile and initialize recipes from API
  useEffect(() => {
    const init = async () => {
      const storedProfile = loadProfile();
      if (!storedProfile) {
        router.push('/onboarding');
        return;
      }
      
      // Initialize local recipes
      await initializeRecipes();
      
      setProfile(storedProfile);
    };
    init();
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

  const regeneratePlan = () => {
    if (!profile) return;
    if (!confirm('Neuen Plan generieren?')) return;
    const dateStr = getDateString(currentDate);
    const plan = generateDayPlan(dateStr, profile);
    saveDayPlan(dateStr, plan);
    setDayPlan(plan);
  };

  const toggleMealEaten = (mealIndex: number) => {
    if (!dayPlan) return;
    const updatedMeals = [...dayPlan.meals];
    updatedMeals[mealIndex] = { ...updatedMeals[mealIndex], eaten: !updatedMeals[mealIndex].eaten };
    const updatedPlan = { ...dayPlan, meals: updatedMeals };
    setDayPlan(updatedPlan);
    saveDayPlan(getDateString(currentDate), updatedPlan);
  };

  const swapMeal = (mealIndex: number, newRecipe: Recipe) => {
    if (!dayPlan) return;
    const updatedMeals = [...dayPlan.meals];
    const oldRecipe = updatedMeals[mealIndex].recipe;
    const scaledRecipe = scaleRecipe(newRecipe, oldRecipe.nutrition.calories);
    updatedMeals[mealIndex] = {
      ...updatedMeals[mealIndex],
      recipe: scaledRecipe,
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

  const handleMealScroll = () => {
    if (mealScrollRef.current && dayPlan) {
      const scrollLeft = mealScrollRef.current.scrollLeft;
      const cardWidth = 320;
      const index = Math.round(scrollLeft / cardWidth);
      setActiveMealIndex(Math.min(index, dayPlan.meals.length - 1));
    }
  };

  if (isLoading || !profile || !dayPlan) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const waterGoal = calculateWaterGoal(profile.weight, profile.sportsFrequency);
  const isToday = getDateString(currentDate) === getDateString(new Date());

  return (
    <div className="min-h-screen bg-gray-50 pb-24 lg:pb-8">
      {/* Header */}
      <div className="sticky top-0 bg-white z-20 shadow-sm">
        {/* Top Bar */}
        <div className="px-4 py-3 flex items-center justify-between border-b border-gray-100">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="FIT-INN" width={36} height={36} className="rounded-xl" />
            <span className="font-bold text-lg text-gray-900 hidden sm:block">FIT-INN Nutrition</span>
          </Link>
          
          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-500">Ziel:</span>
              <span className="font-bold text-teal-600">{profile.targetCalories} kcal</span>
            </div>
            <Link href="/einkaufsliste" data-tutorial="nav-shopping" className="p-2 text-gray-600 hover:text-teal-600 hover:bg-gray-50 rounded-lg transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Swipeable Calendar - 3 Weeks */}
        <div 
          ref={calendarScrollRef}
          data-tutorial="calendar"
          className="overflow-x-auto hide-scrollbar px-2 py-3 bg-gray-50"
        >
          <div className="flex gap-1" style={{ width: 'max-content' }}>
            {allDates.map((date, index) => {
              const isSelected = getDateString(date) === getDateString(currentDate);
              const isTodayDate = getDateString(date) === getDateString(new Date());
              const dayOfWeek = date.getDay();
              const isMonday = dayOfWeek === 1;
              
              return (
                <div key={index} className="flex items-center">
                  {/* Week separator */}
                  {isMonday && index > 0 && (
                    <div className="w-px h-10 bg-gray-300 mx-1" />
                  )}
                  <button
                    onClick={() => setCurrentDate(date)}
                    className={`flex flex-col items-center py-2 px-3 rounded-xl transition-all touch-manipulation min-w-[52px] ${
                      isSelected
                        ? 'bg-teal-600 text-white shadow-md'
                        : isTodayDate
                        ? 'bg-teal-100 text-teal-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <span className="text-[10px] font-medium uppercase">{dayLabels[dayOfWeek]}</span>
                    <span className="text-lg font-bold">{date.getDate()}</span>
                    {isMonday && (
                      <span className="text-[9px] opacity-70">{monthNames[date.getMonth()]}</span>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Current Date Info (Mobile) */}
        <div className="px-4 py-2 bg-white border-t border-gray-100 flex items-center justify-between lg:hidden">
          <div>
            <p className="font-semibold text-gray-900">
              {currentDate.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            {isToday && <span className="text-xs text-teal-600 font-medium">Heute</span>}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={regeneratePlan} className="p-2 rounded-lg bg-gray-100 text-gray-600 touch-manipulation">
              🔄
            </button>
            <div className="text-right">
              <p className="text-xs text-gray-500">Tagesziel</p>
              <p className="font-bold text-teal-600">{profile.targetCalories} kcal</p>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Date Header */}
      <div className="hidden lg:flex items-center justify-between px-8 py-4">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-gray-900">
            {currentDate.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}
          </h2>
          {isToday && <span className="px-3 py-1 bg-teal-100 text-teal-700 text-sm font-medium rounded-full">Heute</span>}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-gray-500">
            <span className="font-bold text-gray-900">{dayPlan.totalCalories}</span> / {profile.targetCalories} kcal
          </span>
          <button onClick={regeneratePlan} className="px-4 py-2 bg-teal-50 text-teal-600 rounded-xl font-medium hover:bg-teal-100 transition-colors">
            🔄 Neuer Plan
          </button>
        </div>
      </div>

      {/* Desktop Meal Grid */}
      <div className="hidden lg:grid grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5 px-8 mb-8">
        {dayPlan.meals.map((meal, index) => (
          <DesktopMealCard
            key={`${meal.type}-${meal.recipe.id}`}
            meal={meal}
            onToggleEaten={() => toggleMealEaten(index)}
            onOpenSwapPanel={() => setSwapPanel({ open: true, mealIndex: index, mealType: meal.type })}
          />
        ))}
      </div>

      {/* Mobile: Meal Cards Horizontal Scroll */}
      <div className="lg:hidden py-4">
        <div 
          ref={mealScrollRef}
          data-tutorial="meals"
          onScroll={handleMealScroll}
          className="flex gap-4 px-4 overflow-x-auto hide-scrollbar snap-x snap-mandatory scroll-smooth"
        >
          {dayPlan.meals.map((meal, index) => (
            <MobileMealCard
              key={`${meal.type}-${meal.recipe.id}`}
              meal={meal}
              onToggleEaten={() => toggleMealEaten(index)}
              onOpenSwapPanel={() => setSwapPanel({ open: true, mealIndex: index, mealType: meal.type })}
            />
          ))}
          <div className="min-w-[16px] shrink-0" />
        </div>

        {/* Meal Indicator */}
        <div className="flex items-center justify-center gap-2 mt-3">
          {dayPlan.meals.map((meal, index) => {
            const info = mealTypeInfo[meal.type];
            return (
              <button
                key={index}
                onClick={() => {
                  if (mealScrollRef.current) {
                    mealScrollRef.current.scrollTo({ left: index * 320, behavior: 'smooth' });
                  }
                }}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all touch-manipulation ${
                  index === activeMealIndex 
                    ? `${info?.bgColor || 'bg-gray-200'} ${info?.color || 'text-gray-700'}` 
                    : 'text-gray-400'
                }`}
              >
                {info?.emoji} {info?.label || meal.type}
              </button>
            );
          })}
        </div>
      </div>

      {/* Extras Section - Barcode Scanner */}
      <ExtrasSection date={getDateString(currentDate)} />

      {/* Daily Stats */}
      <div className="px-4 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-4 max-w-4xl lg:max-w-none mx-auto">
          {/* Summary */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-4">Tagesübersicht</h3>
            <div className="grid grid-cols-4 gap-4 mb-4">
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
                <p className="text-xs text-gray-500">Carbs</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-500">{dayPlan.totalMacros.fat}g</p>
                <p className="text-xs text-gray-500">Fett</p>
              </div>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-teal-400 to-teal-600 rounded-full transition-all"
                style={{ width: `${Math.min((dayPlan.totalCalories / profile.targetCalories!) * 100, 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 text-right mt-1">
              {Math.round((dayPlan.totalCalories / profile.targetCalories!) * 100)}% des Tagesziels
            </p>
          </div>

          {/* Water */}
          <div data-tutorial="water">
            <WaterTracker goal={waterGoal} date={getDateString(currentDate)} />
          </div>
        </div>
      </div>

      {/* Recipe Swap Panel */}
      <RecipeSwapPanel
        isOpen={swapPanel.open}
        onClose={() => setSwapPanel({ open: false, mealIndex: -1, mealType: '' })}
        onSelect={(recipe) => {
          if (swapPanel.mealIndex >= 0) swapMeal(swapPanel.mealIndex, recipe);
        }}
        mealType={swapPanel.mealType}
        currentRecipeId={swapPanel.mealIndex >= 0 ? dayPlan.meals[swapPanel.mealIndex]?.recipe.id : undefined}
      />

      <BottomNav />

      {/* Interactive Tutorial for first-time users */}
      <PlanTutorial onComplete={() => {}} />
    </div>
  );
}
