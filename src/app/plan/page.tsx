'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import BottomNav from '@/components/BottomNav';
import WaterTracker from '@/components/WaterTracker';
import { loadProfile, loadDayPlan, saveDayPlan, saveFavorite, removeFavorite, isFavorite } from '@/lib/storage';
import { generateDayPlan } from '@/lib/mealPlanGenerator';
import { calculateWaterGoal } from '@/lib/calculations';
import { UserProfile, DayPlan, Recipe, MealPlan } from '@/types';
import RecipeSwapPanel from '@/components/RecipeSwapPanel';

function getDateString(date: Date): string {
  return date.toISOString().split('T')[0];
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

function getDietBadges(recipe: Recipe): { label: string; color: string }[] {
  const badges: { label: string; color: string }[] = [];
  if (recipe.dietaryFlags?.includes('vegan')) badges.push({ label: 'Vegan', color: 'bg-green-100 text-green-700' });
  else if (recipe.dietaryFlags?.includes('vegetarian')) badges.push({ label: 'Veggie', color: 'bg-green-100 text-green-700' });
  if (recipe.dietaryFlags?.includes('paleo')) badges.push({ label: 'Paleo', color: 'bg-orange-100 text-orange-700' });
  if (recipe.tags?.includes('high-protein') || recipe.dietaryFlags?.includes('high-protein')) badges.push({ label: 'High Protein', color: 'bg-blue-100 text-blue-700' });
  if (recipe.dietaryFlags?.includes('low-carb')) badges.push({ label: 'Low Carb', color: 'bg-purple-100 text-purple-700' });
  if (recipe.dietaryFlags?.includes('gluten-free')) badges.push({ label: 'Glutenfrei', color: 'bg-yellow-100 text-yellow-700' });
  return badges;
}

// ── Upfit-Style Meal Card ──────────────────────────────────────────────
interface MealCardProps {
  meal: MealPlan;
  compact?: boolean;
  onToggleEaten: () => void;
  onOpenSwapPanel: () => void;
}

function MealCard({ meal, compact = false, onToggleEaten, onOpenSwapPanel }: MealCardProps) {
  const [favorite, setFavorite] = useState(() => isFavorite(meal.recipe.id));
  const { label } = mealTypeLabels[meal.type] || { label: meal.type.toUpperCase() };
  const recipe = meal.recipe;
  const imageUrl = recipe.image && recipe.image.startsWith('http') ? recipe.image : getMealImage(recipe.category, recipe.id);
  const badges = getDietBadges(recipe);

  const handleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (favorite) removeFavorite(recipe.id);
    else saveFavorite(recipe.id);
    setFavorite(!favorite);
  };

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col h-full transition-opacity ${meal.eaten ? 'opacity-60' : ''}`}
         style={{ padding: '20px' }}>
      {/* Meal type label */}
      <p className="text-[11px] font-bold tracking-widest text-gray-400 uppercase mb-1">{label}</p>

      {/* Recipe name */}
      <Link href={`/plan/recipe/${recipe.id}`}>
        <h3 className="font-bold text-gray-900 text-base lg:text-lg leading-tight mb-2 hover:text-teal-600 transition-colors">
          {recipe.name}
        </h3>
      </Link>

      {/* Badges row */}
      <div className="flex flex-wrap items-center gap-1.5 mb-3">
        {badges.map((b, i) => (
          <span key={i} className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${b.color}`}>{b.label}</span>
        ))}
        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600">
          {recipe.nutrition.calories} kcal
        </span>
        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-500">
          ⏱ {recipe.totalTime} min
        </span>
      </div>

      {/* Thumbnail image */}
      <Link href={`/plan/recipe/${recipe.id}`} className="block mb-3 relative group">
        <div className={`relative rounded-lg overflow-hidden bg-gray-100 ${compact ? 'h-20' : 'h-28 lg:h-32'}`}>
          <img src={imageUrl} alt={recipe.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        </div>
        {/* Favorite overlay */}
        <button onClick={handleFavorite}
          className="absolute top-2 right-2 p-1.5 rounded-full bg-white/90 shadow-sm hover:bg-white transition-colors">
          <svg className={`w-4 h-4 ${favorite ? 'text-red-500 fill-current' : 'text-gray-400'}`}
            fill={favorite ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button>
      </Link>

      {/* Zutaten */}
      {!compact && (
        <div className="mb-3">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Zutaten</p>
          <ul className="text-xs text-gray-600 space-y-0.5">
            {recipe.ingredients.slice(0, 6).map((ing, i) => (
              <li key={i} className="flex justify-between">
                <span className="truncate mr-2">{ing.name}</span>
                <span className="text-gray-400 whitespace-nowrap">{ing.amount} {ing.unit}</span>
              </li>
            ))}
            {recipe.ingredients.length > 6 && (
              <li className="text-gray-400 italic text-[10px]">+{recipe.ingredients.length - 6} weitere</li>
            )}
          </ul>
        </div>
      )}

      {/* Zubereitung */}
      {!compact && (
        <div className="mb-4 flex-1">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Zubereitung</p>
          <div className="text-xs text-gray-600 space-y-1">
            {recipe.instructions.slice(0, 3).map((step, i) => (
              <p key={i} className="line-clamp-2">
                <span className="font-semibold text-teal-600">{i + 1}.</span> {step}
              </p>
            ))}
            {recipe.instructions.length > 3 && (
              <p className="text-gray-400 italic text-[10px]">+{recipe.instructions.length - 3} weitere Schritte</p>
            )}
          </div>
        </div>
      )}

      {/* Compact: minimal ingredients */}
      {compact && (
        <div className="mb-3 flex-1">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Zutaten</p>
          <p className="text-xs text-gray-600 line-clamp-3">
            {recipe.ingredients.slice(0, 4).map(i => `${i.amount} ${i.unit} ${i.name}`).join(', ')}
            {recipe.ingredients.length > 4 && ` +${recipe.ingredients.length - 4} mehr`}
          </p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 mt-auto pt-2">
        <button onClick={onOpenSwapPanel}
          className="flex-1 py-2 px-2 rounded-lg border border-gray-200 text-gray-600 text-xs font-medium hover:border-gray-300 hover:bg-gray-50 transition-colors">
          Wechseln
        </button>
        <button onClick={onToggleEaten}
          className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium transition-colors ${
            meal.eaten ? 'bg-teal-600 text-white' : 'border border-teal-500 text-teal-600 hover:bg-teal-50'
          }`}>
          {meal.eaten ? '✓ Gegessen' : '✓ Gegessen'}
        </button>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────
export default function PlanPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [weekDates, setWeekDates] = useState<Date[]>([]);
  const [dayPlan, setDayPlan] = useState<DayPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [swapPanel, setSwapPanel] = useState<{ open: boolean; mealIndex: number; mealType: string }>({ open: false, mealIndex: -1, mealType: '' });

  useEffect(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1) + (selectedWeek - 1) * 7);
    const dates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      dates.push(d);
    }
    setWeekDates(dates);
    setCurrentDate(selectedWeek === 1 ? today : dates[0]);
  }, [selectedWeek]);

  useEffect(() => {
    const storedProfile = loadProfile();
    if (!storedProfile) { router.push('/onboarding'); return; }
    setProfile(storedProfile);
  }, [router]);

  useEffect(() => {
    if (!profile) return;
    const dateStr = getDateString(currentDate);
    let plan = loadDayPlan(dateStr);
    if (!plan) { plan = generateDayPlan(dateStr, profile); saveDayPlan(dateStr, plan); }
    setDayPlan(plan);
    setIsLoading(false);
  }, [profile, currentDate]);

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

  if (isLoading || !profile || !dayPlan) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F2F0F0' }}>
        <div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const waterGoal = calculateWaterGoal(profile.weight, profile.sportsFrequency);
  const isToday = getDateString(currentDate) === getDateString(new Date());

  // Separate meals into main meals and snacks for the 4-column grid
  const mainMealTypes = ['breakfast', 'lunch', 'dinner'];
  const snackTypes = ['morningSnack', 'afternoonSnack', 'lateSnack'];
  const mainMeals = dayPlan.meals.filter(m => mainMealTypes.includes(m.type));
  const snackMeals = dayPlan.meals.filter(m => snackTypes.includes(m.type));

  return (
    <div className="min-h-screen pb-24 lg:pb-8" style={{ background: '#F2F0F0' }}>
      {/* ── Sticky Header ── */}
      <div className="sticky top-0 bg-white z-20 shadow-sm">
        {/* Top Bar */}
        <div className="px-4 lg:px-8 py-3 flex items-center justify-between border-b border-gray-100">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/logo.png" alt="FIT-INN" width={36} height={36} className="rounded-xl" />
            <span className="font-bold text-lg text-gray-900 hidden sm:block">FIT-INN Nutrition</span>
            <span className="font-bold text-lg text-gray-900 sm:hidden">FIT-INN</span>
          </Link>
          <div className="flex items-center gap-1 sm:gap-3">
            <Link href="/einkaufsliste"
              className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-teal-600 hover:bg-gray-50 rounded-lg transition-colors flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span className="hidden sm:inline">Einkaufen</span>
            </Link>
          </div>
        </div>

        {/* Week Tabs */}
        <div className="px-4 lg:px-8 py-2 border-b border-gray-100">
          <div className="flex items-center justify-center gap-1">
            {[1, 2, 3].map((week) => (
              <button key={week} onClick={() => setSelectedWeek(week)}
                className={`px-4 py-2 text-sm font-medium transition-colors rounded-lg ${
                  selectedWeek === week ? 'text-teal-600 bg-teal-50' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                }`}>
                Woche {week}
              </button>
            ))}
          </div>
        </div>

        {/* Day Selector */}
        <div className="px-4 lg:px-8 py-3">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            {weekDates.map((date, index) => {
              const isSelected = getDateString(date) === getDateString(currentDate);
              const isTodayDate = getDateString(date) === getDateString(new Date());
              const dayLabel = dayLabels[(index + 1) % 7];
              return (
                <button key={index} onClick={() => setCurrentDate(date)}
                  className={`flex flex-col items-center py-2 px-2 sm:px-4 rounded-xl transition-all ${
                    isSelected ? 'bg-teal-600 text-white shadow-md'
                    : isTodayDate ? 'bg-teal-50 text-teal-600'
                    : 'text-gray-500 hover:bg-gray-100'
                  }`}>
                  <span className="text-xs font-medium">{dayLabel}</span>
                  <span className={`text-lg font-bold mt-0.5 ${isSelected ? 'text-white' : ''}`}>{date.getDate()}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Daily Macro Summary Bar */}
        <div className="px-4 lg:px-8 py-2 border-t border-gray-100 bg-gray-50">
          <div className="flex items-center justify-center gap-4 sm:gap-8 text-xs sm:text-sm">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-gray-900">{dayPlan.totalCalories}</span>
              <span className="text-gray-400">/ {profile.targetCalories} kcal</span>
            </div>
            <div className="hidden sm:block w-px h-4 bg-gray-300" />
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-400" />
              <span className="font-semibold text-gray-700">{dayPlan.totalMacros.protein}g</span>
              <span className="text-gray-400">Protein</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-yellow-400" />
              <span className="font-semibold text-gray-700">{dayPlan.totalMacros.carbs}g</span>
              <span className="text-gray-400">Carbs</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              <span className="font-semibold text-gray-700">{dayPlan.totalMacros.fat}g</span>
              <span className="text-gray-400">Fett</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="px-4 lg:px-8 py-6 max-w-[1400px] mx-auto">
        {/* Date headline - desktop */}
        <div className="hidden lg:flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-gray-900">
              {currentDate.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}
            </h2>
            {isToday && <span className="px-2.5 py-0.5 bg-teal-100 text-teal-700 text-xs font-medium rounded-full">Heute</span>}
          </div>
        </div>

        {/* ── Desktop: 4-Column Upfit Grid ── */}
        <div className="hidden lg:grid lg:grid-cols-4 gap-5 mb-8" style={{ alignItems: 'start' }}>
          {/* Columns 1-3: Main meals */}
          {mainMeals.map((meal) => {
            const mealIndex = dayPlan.meals.indexOf(meal);
            return (
              <MealCard
                key={`${meal.type}-${meal.recipe.id}`}
                meal={meal}
                onToggleEaten={() => toggleMealEaten(mealIndex)}
                onOpenSwapPanel={() => setSwapPanel({ open: true, mealIndex, mealType: meal.type })}
              />
            );
          })}

          {/* Column 4: Stacked snacks */}
          {snackMeals.length > 0 && (
            <div className="flex flex-col gap-5">
              {snackMeals.map((meal) => {
                const mealIndex = dayPlan.meals.indexOf(meal);
                return (
                  <MealCard
                    key={`${meal.type}-${meal.recipe.id}`}
                    meal={meal}
                    compact
                    onToggleEaten={() => toggleMealEaten(mealIndex)}
                    onOpenSwapPanel={() => setSwapPanel({ open: true, mealIndex, mealType: meal.type })}
                  />
                );
              })}
            </div>
          )}

          {/* If no snacks but fewer than 3 main meals, fill remaining cols */}
          {snackMeals.length === 0 && mainMeals.length < 4 && <div />}
        </div>

        {/* ── Mobile: Single column stack ── */}
        <div className="lg:hidden space-y-4 mb-6">
          {dayPlan.meals.map((meal, index) => (
            <MealCard
              key={`${meal.type}-${meal.recipe.id}`}
              meal={meal}
              compact={snackTypes.includes(meal.type)}
              onToggleEaten={() => toggleMealEaten(index)}
              onOpenSwapPanel={() => setSwapPanel({ open: true, mealIndex: index, mealType: meal.type })}
            />
          ))}
        </div>

        {/* ── Water Tracker ── */}
        <div className="max-w-xl mx-auto lg:max-w-none lg:grid lg:grid-cols-2 gap-5">
          {/* Daily Summary Card */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 mb-4 lg:mb-0">
            <h3 className="font-semibold text-gray-900 mb-4">Tagesübersicht</h3>
            <div className="grid grid-cols-4 gap-3 text-center">
              <div>
                <p className="text-2xl font-bold text-teal-600">{dayPlan.totalCalories}</p>
                <p className="text-xs text-gray-500">kcal</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-500">{dayPlan.totalMacros.protein}g</p>
                <p className="text-xs text-gray-500">Protein</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-500">{dayPlan.totalMacros.carbs}g</p>
                <p className="text-xs text-gray-500">Kohlenh.</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-500">{dayPlan.totalMacros.fat}g</p>
                <p className="text-xs text-gray-500">Fett</p>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-sm text-gray-500 mb-1">
                <span>Kalorienziel</span>
                <span>{Math.round((dayPlan.totalCalories / profile.targetCalories!) * 100)}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-teal-400 to-teal-600 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min((dayPlan.totalCalories / profile.targetCalories!) * 100, 100)}%` }} />
              </div>
            </div>
          </div>
          <WaterTracker goal={waterGoal} date={getDateString(currentDate)} />
        </div>
      </div>

      {/* Swap Panel */}
      <RecipeSwapPanel
        isOpen={swapPanel.open}
        onClose={() => setSwapPanel({ open: false, mealIndex: -1, mealType: '' })}
        onSelect={(recipe) => { if (swapPanel.mealIndex >= 0) swapMeal(swapPanel.mealIndex, recipe); }}
        mealType={swapPanel.mealType}
        currentRecipeId={swapPanel.mealIndex >= 0 && dayPlan?.meals[swapPanel.mealIndex] ? dayPlan.meals[swapPanel.mealIndex].recipe.id : undefined}
      />

      <BottomNav />
    </div>
  );
}
