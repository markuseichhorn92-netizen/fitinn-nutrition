'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import BottomNav from '@/components/BottomNav';
import WaterTracker from '@/components/WaterTracker';
import { loadProfile, loadDayPlan, saveDayPlan, saveFavorite, removeFavorite, isFavorite } from '@/lib/storage';
import { generateDayPlan, scaleRecipe, generateShoppingList } from '@/lib/mealPlanGenerator';
import { calculateWaterGoal } from '@/lib/calculations';
import { UserProfile, DayPlan, Recipe, MealPlan } from '@/types';
import RecipeSwapPanel from '@/components/RecipeSwapPanel';

function getDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

const dayLabels = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const dayLabelsFull = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

const mealTypeInfo: Record<string, { label: string; emoji: string; time: string }> = {
  breakfast: { label: 'Frühstück', emoji: '🌅', time: '07:00' },
  morningSnack: { label: 'Snack', emoji: '🍎', time: '10:00' },
  lunch: { label: 'Mittagessen', emoji: '☀️', time: '12:30' },
  afternoonSnack: { label: 'Snack', emoji: '🍌', time: '15:00' },
  dinner: { label: 'Abendessen', emoji: '🌙', time: '19:00' },
  lateSnack: { label: 'Snack', emoji: '🌜', time: '21:00' },
};

// Mobile Meal Card - Simple & Clear
function MobileMealCard({ 
  meal, 
  onToggleEaten, 
  onOpenSwap,
  isFirst
}: {
  meal: MealPlan;
  onToggleEaten: () => void;
  onOpenSwap: () => void;
  isFirst?: boolean;
}) {
  const [favorite, setFavorite] = useState(() => isFavorite(meal.recipe.id));
  const { label, emoji, time } = mealTypeInfo[meal.type] || { label: meal.type, emoji: '🍽️', time: '' };
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
    <div className={`meal-card-mobile ${isFirst ? 'ml-4' : ''}`}>
      {/* Header with meal type */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-xl">{emoji}</span>
          <span className="font-semibold text-gray-900">{label}</span>
        </div>
        <span className="text-sm text-gray-500">{time}</span>
      </div>
      
      {/* Content */}
      <div className="p-4">
        <Link href={`/plan/recipe/${recipe.id}`}>
          <h3 className="font-semibold text-gray-900 text-lg mb-3 line-clamp-2 active:text-teal-600">
            {recipe.name}
          </h3>
        </Link>
        
        {/* Quick Info */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-1.5 bg-orange-100 text-orange-700 px-3 py-1.5 rounded-full">
            <span className="font-bold">{recipe.nutrition.calories}</span>
            <span className="text-sm">kcal</span>
          </div>
          <div className="flex items-center gap-1.5 text-gray-500">
            <span>⏱️</span>
            <span>{recipe.totalTime} min</span>
          </div>
        </div>

        {/* Ingredients Preview */}
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
          {recipe.ingredients.slice(0, 3).map(i => i.name).join(', ')}
          {recipe.ingredients.length > 3 && ` +${recipe.ingredients.length - 3} mehr`}
        </p>

        {/* Actions - Big Touch Targets */}
        <div className="flex gap-2">
          <button
            onClick={handleFavorite}
            className={`p-3 rounded-xl transition-all active:scale-95 touch-manipulation ${
              favorite ? 'bg-red-50 text-red-500' : 'bg-gray-100 text-gray-500'
            }`}
          >
            <svg className="w-6 h-6" fill={favorite ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>
          <button
            onClick={onOpenSwap}
            className="flex-1 py-3 px-4 rounded-xl bg-gray-100 text-gray-700 font-semibold active:scale-[0.98] transition-all touch-manipulation"
          >
            🔄 Anderes Rezept
          </button>
          <button
            onClick={onToggleEaten}
            className={`flex-1 py-3 px-4 rounded-xl font-semibold active:scale-[0.98] transition-all touch-manipulation ${
              meal.eaten
                ? 'bg-teal-500 text-white'
                : 'bg-teal-50 text-teal-700 border-2 border-teal-500'
            }`}
          >
            {meal.eaten ? '✓ Gegessen' : 'Gegessen?'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PlanPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [weekDates, setWeekDates] = useState<Date[]>([]);
  const [dayPlan, setDayPlan] = useState<DayPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeMealIndex, setActiveMealIndex] = useState(0);
  const [swapPanel, setSwapPanel] = useState<{ open: boolean; mealIndex: number; mealType: string }>({ open: false, mealIndex: -1, mealType: '' });
  const [showSwipeHint, setShowSwipeHint] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Initialize week dates
  useEffect(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    
    const dates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      dates.push(date);
    }
    setWeekDates(dates);
    setCurrentDate(today);
  }, []);

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

  // Hide swipe hint after first scroll
  const handleScroll = () => {
    setShowSwipeHint(false);
    if (scrollContainerRef.current && dayPlan) {
      const scrollLeft = scrollContainerRef.current.scrollLeft;
      const cardWidth = 320;
      const index = Math.round(scrollLeft / cardWidth);
      setActiveMealIndex(Math.min(index, dayPlan.meals.length - 1));
    }
  };

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

  const scrollToMeal = (index: number) => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        left: index * 320,
        behavior: 'smooth'
      });
    }
  };

  if (isLoading || !profile || !dayPlan) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <div className="animate-spin w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full mb-4" />
        <p className="text-gray-500">Plan wird geladen...</p>
      </div>
    );
  }

  const waterGoal = calculateWaterGoal(profile.weight, profile.sportsFrequency);
  const isToday = getDateString(currentDate) === getDateString(new Date());
  const calorieProgress = Math.round((dayPlan.totalCalories / profile.targetCalories!) * 100);

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 bg-white z-20 shadow-sm safe-area-top">
        {/* Logo & Day Info */}
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="FIT-INN" width={40} height={40} className="rounded-xl" />
            <div>
              <p className="font-bold text-gray-900">
                {isToday ? 'Heute' : dayLabelsFull[currentDate.getDay()]}
              </p>
              <p className="text-sm text-gray-500">
                {currentDate.toLocaleDateString('de-DE', { day: 'numeric', month: 'long' })}
              </p>
            </div>
          </div>
          
          {/* Calorie Badge */}
          <div className="bg-teal-50 px-4 py-2 rounded-xl">
            <p className="text-xs text-teal-600">Tagesziel</p>
            <p className="font-bold text-teal-700">{profile.targetCalories} kcal</p>
          </div>
        </div>

        {/* Day Selector */}
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
          <div className="flex items-center justify-between">
            {weekDates.map((date, index) => {
              const isSelected = getDateString(date) === getDateString(currentDate);
              const isTodayDate = getDateString(date) === getDateString(new Date());
              const dayOfWeek = date.getDay();
              
              return (
                <button
                  key={index}
                  onClick={() => setCurrentDate(date)}
                  className={`flex flex-col items-center py-2 px-3 rounded-xl transition-all touch-manipulation ${
                    isSelected
                      ? 'bg-teal-600 text-white shadow-lg shadow-teal-500/30'
                      : isTodayDate
                      ? 'bg-teal-100 text-teal-700'
                      : 'text-gray-600'
                  }`}
                >
                  <span className="text-xs font-medium">{dayLabels[dayOfWeek]}</span>
                  <span className={`text-lg font-bold mt-0.5`}>
                    {date.getDate()}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Calorie Progress Bar */}
      <div className="px-4 py-3 bg-white border-b border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-500">Heute gegessen</span>
          <span className="text-sm font-semibold">
            <span className="text-teal-600">{dayPlan.totalCalories}</span>
            <span className="text-gray-400"> / {profile.targetCalories} kcal</span>
          </span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${
              calorieProgress > 100 ? 'bg-red-500' : 'bg-gradient-to-r from-teal-400 to-teal-600'
            }`}
            style={{ width: `${Math.min(calorieProgress, 100)}%` }}
          />
        </div>
      </div>

      {/* Meal Cards - Horizontal Scroll */}
      <div className="py-6">
        {/* Swipe Hint */}
        {showSwipeHint && dayPlan.meals.length > 1 && (
          <div className="flex items-center justify-center gap-2 text-gray-400 text-sm mb-4 animate-pulse">
            <span>👈</span>
            <span>Wische für mehr Mahlzeiten</span>
            <span>👉</span>
          </div>
        )}

        <div 
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className={`flex gap-4 px-4 overflow-x-auto hide-scrollbar snap-x snap-mandatory scroll-smooth pb-4 ${
            showSwipeHint ? 'swipe-hint' : ''
          }`}
        >
          {dayPlan.meals.map((meal, index) => (
            <MobileMealCard
              key={`${meal.type}-${meal.recipe.id}`}
              meal={meal}
              onToggleEaten={() => toggleMealEaten(index)}
              onOpenSwap={() => setSwapPanel({ open: true, mealIndex: index, mealType: meal.type })}
              isFirst={index === 0}
            />
          ))}
          {/* Spacer at end */}
          <div className="min-w-[16px] shrink-0" />
        </div>

        {/* Dots Navigation */}
        <div className="flex items-center justify-center gap-2 mt-4">
          {dayPlan.meals.map((meal, index) => (
            <button
              key={index}
              onClick={() => scrollToMeal(index)}
              className={`h-3 rounded-full transition-all touch-manipulation ${
                index === activeMealIndex ? 'w-8 bg-teal-500' : 'w-3 bg-gray-300'
              }`}
              aria-label={`Zu ${mealTypeInfo[meal.type]?.label || 'Mahlzeit'} wechseln`}
            />
          ))}
        </div>

        {/* Meal Labels under dots */}
        <div className="flex items-center justify-center mt-2">
          <span className="text-sm text-gray-600 font-medium">
            {mealTypeInfo[dayPlan.meals[activeMealIndex]?.type]?.emoji}{' '}
            {mealTypeInfo[dayPlan.meals[activeMealIndex]?.type]?.label}
          </span>
        </div>
      </div>

      {/* Daily Stats */}
      <div className="px-4 space-y-4">
        {/* Macros Card */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Makronährstoffe</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-2">
                <span className="text-xl">🥩</span>
              </div>
              <p className="text-xl font-bold text-gray-900">{dayPlan.totalMacros.protein}g</p>
              <p className="text-xs text-gray-500">Eiweiß</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-2">
                <span className="text-xl">🍞</span>
              </div>
              <p className="text-xl font-bold text-gray-900">{dayPlan.totalMacros.carbs}g</p>
              <p className="text-xs text-gray-500">Kohlenhydrate</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-2">
                <span className="text-xl">🥑</span>
              </div>
              <p className="text-xl font-bold text-gray-900">{dayPlan.totalMacros.fat}g</p>
              <p className="text-xs text-gray-500">Fett</p>
            </div>
          </div>
        </div>

        {/* Water Tracker */}
        <WaterTracker goal={waterGoal} date={getDateString(currentDate)} />

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4 pb-4">
          <Link 
            href="/einkaufsliste"
            className="bg-white rounded-2xl p-5 shadow-sm flex items-center gap-4 active:scale-[0.98] transition-transform touch-manipulation"
          >
            <span className="text-3xl">🛒</span>
            <div>
              <p className="font-semibold text-gray-900">Einkaufsliste</p>
              <p className="text-sm text-gray-500">Zutaten ansehen</p>
            </div>
          </Link>
          <Link 
            href="/favoriten"
            className="bg-white rounded-2xl p-5 shadow-sm flex items-center gap-4 active:scale-[0.98] transition-transform touch-manipulation"
          >
            <span className="text-3xl">❤️</span>
            <div>
              <p className="font-semibold text-gray-900">Favoriten</p>
              <p className="text-sm text-gray-500">Deine Lieblinge</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Recipe Swap Panel */}
      <RecipeSwapPanel
        isOpen={swapPanel.open}
        onClose={() => setSwapPanel({ open: false, mealIndex: -1, mealType: '' })}
        onSelect={(recipe) => {
          if (swapPanel.mealIndex >= 0) {
            swapMeal(swapPanel.mealIndex, recipe);
          }
        }}
        mealType={swapPanel.mealType}
        currentRecipeId={swapPanel.mealIndex >= 0 && dayPlan?.meals[swapPanel.mealIndex] ? dayPlan.meals[swapPanel.mealIndex].recipe.id : undefined}
      />

      {/* Bottom Nav */}
      <BottomNav />
    </div>
  );
}
