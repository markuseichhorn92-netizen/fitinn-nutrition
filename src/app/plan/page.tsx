'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import BottomNav from '@/components/BottomNav';
import WaterTracker from '@/components/WaterTracker';
import { loadProfile, loadDayPlan, saveDayPlan, loadAllPlans, saveFavorite, removeFavorite, isFavorite } from '@/lib/storage';
import { generateDayPlan, scaleRecipe, generateShoppingList } from '@/lib/mealPlanGenerator';
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

interface DesktopMealCardProps {
  meal: MealPlan;
  onToggleEaten: () => void;
  onSwap: (recipe: Recipe) => void;
  onOpenSwapPanel: () => void;
}

// Desktop meal card - shows all info including ingredients and instructions
function DesktopMealCard({ meal, onToggleEaten, onSwap, onOpenSwapPanel }: DesktopMealCardProps) {
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [favorite, setFavorite] = useState(() => isFavorite(meal.recipe.id));
  const { label } = mealTypeLabels[meal.type] || { label: meal.type.toUpperCase() };
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
      {/* Meal Label */}
      <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
        <span className="text-xs font-bold tracking-wider text-gray-500">{label}</span>
      </div>

      {/* Icon Banner */}
      <Link href={`/plan/recipe/${recipe.id}`} className="block relative">
        <div className={`flex items-center justify-between px-4 py-3 ${
          recipe.category === 'breakfast' ? 'bg-amber-50' :
          recipe.category === 'lunch' ? 'bg-emerald-50' :
          recipe.category === 'dinner' ? 'bg-indigo-50' : 'bg-orange-50'
        }`}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">{
              recipe.category === 'breakfast' ? '🥣' :
              recipe.category === 'lunch' ? '🥗' :
              recipe.category === 'dinner' ? '🍲' : '🥜'
            }</span>
            <div>
              <span className="text-sm font-semibold text-gray-800">{recipe.nutrition.calories} kcal</span>
              <span className="text-xs text-gray-500 ml-2">⏱ {recipe.totalTime} min</span>
            </div>
          </div>
          <button
            onClick={handleFavorite}
            className="p-2 rounded-full hover:bg-white/60 transition-colors"
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
        </div>
      </Link>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col">
        <Link href={`/plan/recipe/${recipe.id}`}>
          <h3 className="font-semibold text-gray-900 text-base mb-2 line-clamp-2 hover:text-teal-600 transition-colors">
            {recipe.name}
          </h3>
        </Link>
        
        {/* Info Line */}
        <div className="flex items-center flex-wrap gap-2 text-xs text-gray-500 mb-3">
          <span className="text-teal-600 font-medium">{getDietTag(recipe)}</span>
          <span className="text-gray-300">|</span>
          <span className="font-medium">{recipe.nutrition.calories} kcal</span>
          <span className="text-gray-300">|</span>
          <span>{recipe.totalTime} min</span>
        </div>

        {/* Ingredients Section */}
        <div className="mb-3">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Zutaten</p>
          <ul className="text-xs text-gray-600 space-y-0.5 max-h-24 overflow-y-auto">
            {recipe.ingredients.slice(0, 6).map((ing, i) => (
              <li key={i} className="flex justify-between">
                <span className="truncate mr-2">{ing.name}</span>
                <span className="text-gray-400 whitespace-nowrap">{ing.amount} {ing.unit}</span>
              </li>
            ))}
            {recipe.ingredients.length > 6 && (
              <li className="text-gray-400 italic">+{recipe.ingredients.length - 6} weitere...</li>
            )}
          </ul>
        </div>

        {/* Instructions Preview */}
        <div className="mb-4 flex-1">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Zubereitung</p>
          <div className="text-xs text-gray-600 space-y-1 max-h-20 overflow-y-auto">
            {recipe.instructions.slice(0, 3).map((step, i) => (
              <p key={i} className="line-clamp-2">
                <span className="font-medium text-teal-600">{i + 1}.</span> {step}
              </p>
            ))}
            {recipe.instructions.length > 3 && (
              <p className="text-gray-400 italic">+{recipe.instructions.length - 3} weitere Schritte...</p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-1.5 mt-auto">
          <button
            onClick={() => setShowAlternatives(true)}
            className="flex-1 py-2 px-2 rounded-lg border border-gray-200 text-gray-600 text-xs font-medium hover:border-gray-300 hover:bg-gray-50 transition-colors"
          >
            AUSLASSEN
          </button>
          <button
            onClick={onOpenSwapPanel}
            className="flex-1 py-2 px-2 rounded-lg border border-gray-200 text-gray-600 text-xs font-medium hover:border-gray-300 hover:bg-gray-50 transition-colors"
          >
            WECHSELN
          </button>
          <button
            onClick={onToggleEaten}
            className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium transition-colors ${
              meal.eaten
                ? 'bg-teal-600 text-white'
                : 'border border-teal-500 text-teal-600 hover:bg-teal-50'
            }`}
          >
            {meal.eaten ? 'GEWÄHLT ✓' : 'WÄHLEN'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Mobile meal card - horizontal swipeable version
interface MobileMealCardProps {
  meal: MealPlan;
  onToggleEaten: () => void;
  onSwap: (recipe: Recipe) => void;
  onOpenSwapPanel: () => void;
}

function MobileMealCard({ meal, onToggleEaten, onSwap, onOpenSwapPanel }: MobileMealCardProps) {
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [favorite, setFavorite] = useState(() => isFavorite(meal.recipe.id));
  const { label } = mealTypeLabels[meal.type] || { label: meal.type.toUpperCase() };
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
    <div className="min-w-[300px] max-w-[340px] snap-center shrink-0">
      <div className={`bg-white rounded-2xl overflow-hidden shadow-sm ${meal.eaten ? 'opacity-60' : ''}`}>
        {/* Icon Banner */}
        <Link href={`/plan/recipe/${recipe.id}`}>
          <div className={`flex items-center justify-between px-4 py-3 ${
            recipe.category === 'breakfast' ? 'bg-amber-50' :
            recipe.category === 'lunch' ? 'bg-emerald-50' :
            recipe.category === 'dinner' ? 'bg-indigo-50' : 'bg-orange-50'
          }`}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{
                recipe.category === 'breakfast' ? '🥣' :
                recipe.category === 'lunch' ? '🥗' :
                recipe.category === 'dinner' ? '🍲' : '🥜'
              }</span>
              <div>
                <span className="text-sm font-semibold text-gray-800">{recipe.nutrition.calories} kcal</span>
                <span className="text-xs text-gray-500 ml-2">⏱ {recipe.totalTime} min</span>
              </div>
            </div>
            <button
              onClick={handleFavorite}
              className="p-2 rounded-full hover:bg-white/60 transition-colors"
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
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
            <span className="text-teal-600 font-medium">{getDietTag(recipe)}</span>
            <span>|</span>
            <span>{recipe.nutrition.calories} kcal</span>
            <span>|</span>
            <span>{recipe.totalTime} min</span>
          </div>

          {/* Ingredients Preview */}
          <div className="mb-3">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Zutaten</p>
            <p className="text-sm text-gray-600 line-clamp-2">
              {recipe.ingredients.slice(0, 4).map(i => i.name).join(', ')}
              {recipe.ingredients.length > 4 && ` +${recipe.ingredients.length - 4} mehr`}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={onOpenSwapPanel}
              className="flex-1 py-2.5 px-3 rounded-lg border border-gray-200 text-gray-600 text-xs font-medium hover:border-gray-300 transition-colors"
            >
              WECHSELN
            </button>
            <button
              onClick={onToggleEaten}
              className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-medium transition-colors ${
                meal.eaten
                  ? 'bg-teal-600 text-white'
                  : 'border border-teal-500 text-teal-600 hover:bg-teal-50'
              }`}
            >
              {meal.eaten ? 'GEWÄHLT ✓' : 'WÄHLEN'}
            </button>
          </div>
        </div>
      </div>
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
  const [swapPanel, setSwapPanel] = useState<{ open: boolean; mealIndex: number; mealType: string }>({ open: false, mealIndex: -1, mealType: '' });
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

  const regeneratePlan = () => {
    if (!profile) return;
    if (!confirm('Neuen Plan generieren? Der alte wird überschrieben.')) return;
    const dateStr = getDateString(currentDate);
    const plan = generateDayPlan(dateStr, profile);
    saveDayPlan(dateStr, plan);
    setDayPlan(plan);
    setActiveMealIndex(0);
  };

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

  const exportPDF = () => {
    if (!profile || !dayPlan) return;
    // Collect all week plans
    const plans: { date: string; plan: DayPlan }[] = [];
    for (const date of weekDates) {
      const dateStr = getDateString(date);
      const plan = loadDayPlan(dateStr);
      if (plan) plans.push({ date: date.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' }), plan });
    }

    const printContent = `<!DOCTYPE html><html><head><title>FIT-INN Wochenplan</title>
<style>
body{font-family:Arial,sans-serif;padding:20px;font-size:12px;color:#333}
h1{color:#0d9488;font-size:20px;margin-bottom:4px}
h2{color:#374151;font-size:14px;margin-top:16px;border-bottom:1px solid #e5e7eb;padding-bottom:4px}
.meal{padding:6px 0;display:flex;justify-content:space-between}
.meal-name{font-weight:600}
.kcal{color:#6b7280}
.ingredients{color:#9ca3af;font-size:11px;margin-top:2px}
.page-break{page-break-before:always}
.shopping h3{margin-top:12px;font-size:12px;text-transform:uppercase;color:#6b7280}
.shopping .item{padding:4px 0;display:flex;justify-content:space-between;border-bottom:1px solid #f3f4f6}
</style></head><body>
<h1>🏋️ FIT-INN Wochenplan</h1>
<p style="color:#6b7280">Kalorienziel: ${profile.targetCalories} kcal/Tag</p>
${plans.map(({ date, plan }) => `
<h2>${date}</h2>
${plan.meals.map(m => `
<div class="meal">
  <div>
    <span class="meal-name">${m.recipe.name}</span>
    <div class="ingredients">${m.recipe.ingredients.slice(0, 5).map(i => `${i.amount} ${i.unit} ${i.name}`).join(', ')}</div>
  </div>
  <span class="kcal">${m.recipe.nutrition.calories} kcal</span>
</div>`).join('')}
<div class="meal"><strong>Gesamt: ${plan.totalCalories} kcal</strong></div>
`).join('')}
<div class="page-break shopping">
<h1>🛒 Einkaufsliste</h1>
${(() => {
  const allPlans = plans.map(p => p.plan);
  const shoppingMap = generateShoppingList(allPlans);
  const grouped: Record<string, { name: string; amount: number; unit: string }[]> = {};
  shoppingMap.forEach((v, k) => {
    const cat = v.category || 'Sonstiges';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push({ name: k.charAt(0).toUpperCase() + k.slice(1), amount: Math.round(v.amount * 10) / 10, unit: v.unit });
  });
  return Object.entries(grouped).map(([cat, items]) =>
    `<h3>${cat}</h3>${items.map(i => `<div class="item"><span>☐ ${i.name}</span><span>${i.amount} ${i.unit}</span></div>`).join('')}`
  ).join('');
})()}
</div>
</body></html>`;

    const w = window.open('', '_blank');
    if (w) { w.document.write(printContent); w.document.close(); w.print(); }
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
    // Scale the new recipe to match the calorie target of the old one
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

  // Track scroll position for dot indicator (mobile)
  const handleScroll = () => {
    if (scrollContainerRef.current && dayPlan) {
      const scrollLeft = scrollContainerRef.current.scrollLeft;
      const cardWidth = 316; // card width + gap
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
      {/* Header - Full Width */}
      <div className="sticky top-0 bg-white z-20 shadow-sm">
        {/* Top Bar with Logo & Actions */}
        <div className="px-4 lg:px-8 py-3 flex items-center justify-between border-b border-gray-100">
          <Link href="/" className="flex items-center gap-3">
            <Image 
              src="/logo.png" 
              alt="FIT-INN" 
              width={40} 
              height={40} 
              className="rounded-xl"
            />
            <span className="font-bold text-xl text-gray-900 hidden sm:block">FIT-INN Nutrition</span>
            <span className="font-bold text-lg text-gray-900 sm:hidden">FIT-INN</span>
          </Link>
          
          <div className="flex items-center gap-1 sm:gap-3">
            {/* Calorie Goal - Desktop */}
            <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-xl mr-2">
              <span className="text-gray-500 text-sm">Tagesziel:</span>
              <span className="font-bold text-teal-600">{profile.targetCalories} kcal</span>
            </div>
            
            <Link 
              href="/einkaufsliste"
              className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-teal-600 hover:bg-gray-50 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span className="hidden sm:inline">EINKAUFEN</span>
            </Link>
            <button className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-teal-600 hover:bg-gray-50 rounded-lg transition-colors flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              <span className="hidden sm:inline">DRUCKEN</span>
            </button>
          </div>
        </div>

        {/* Week Navigation */}
        <div className="px-4 lg:px-8 py-2 border-b border-gray-100">
          <div className="flex items-center justify-center gap-1">
            {[1, 2, 3].map((week) => (
              <button
                key={week}
                onClick={() => setSelectedWeek(week)}
                className={`px-4 py-2 text-sm font-medium transition-colors rounded-lg ${
                  selectedWeek === week
                    ? 'text-teal-600 bg-teal-50'
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                }`}
              >
                WOCHE {week}
              </button>
            ))}
          </div>
        </div>

        {/* Day Selector - Full Width */}
        <div className="px-4 lg:px-8 py-3 bg-white">
          <div className="flex items-center justify-between max-w-4xl mx-auto lg:max-w-none">
            {weekDates.map((date, index) => {
              const isSelected = getDateString(date) === getDateString(currentDate);
              const isTodayDate = getDateString(date) === getDateString(new Date());
              const dayLabel = dayLabels[(index + 1) % 7];
              
              return (
                <button
                  key={index}
                  onClick={() => setCurrentDate(date)}
                  className={`flex flex-col items-center py-2 px-2 sm:px-4 rounded-xl transition-all ${
                    isSelected
                      ? 'bg-teal-600 text-white shadow-md'
                      : isTodayDate
                      ? 'bg-teal-50 text-teal-600'
                      : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  <span className="text-xs font-medium">{dayLabel}</span>
                  <span className={`text-lg sm:text-xl font-bold mt-0.5 ${isSelected ? 'text-white' : ''}`}>
                    {date.getDate()}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Date Info Bar - Mobile Only */}
      <div className="px-4 py-3 bg-white border-b border-gray-100 md:hidden">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">
              {currentDate.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            {isToday && <span className="text-xs text-teal-600 font-medium">Heute</span>}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => regeneratePlan()} className="px-3 py-1.5 rounded-lg bg-teal-50 text-teal-600 font-medium text-xs hover:bg-teal-100 transition-colors">
              🔄
            </button>
            <button onClick={exportPDF} className="px-3 py-1.5 rounded-lg bg-gray-50 text-gray-600 font-medium text-xs hover:bg-gray-100 transition-colors">
              📄
            </button>
            <div className="text-right">
              <p className="text-sm text-gray-500">Tagesziel</p>
              <p className="font-semibold text-gray-900">{profile.targetCalories} kcal</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="lg:px-8 lg:py-6">
        {/* Desktop: Date display */}
        <div className="hidden lg:flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold text-gray-900">
              {currentDate.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}
            </h2>
            {isToday && (
              <span className="px-3 py-1 bg-teal-100 text-teal-700 text-sm font-medium rounded-full">
                Heute
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <span>Aktuell: <span className="font-bold text-gray-900">{dayPlan.totalCalories} kcal</span> von <span className="font-bold text-teal-600">{profile.targetCalories} kcal</span></span>
            <button onClick={() => regeneratePlan()} className="px-3 py-1.5 rounded-xl bg-teal-50 text-teal-600 font-medium hover:bg-teal-100 transition-colors text-sm">
              🔄 Neuer Plan
            </button>
            <button onClick={exportPDF} className="px-3 py-1.5 rounded-xl bg-gray-50 text-gray-600 font-medium hover:bg-gray-100 transition-colors text-sm">
              📄 Plan als PDF
            </button>
          </div>
        </div>

        {/* Desktop Meal Grid */}
        <div className="hidden lg:grid grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5 mb-8">
          {dayPlan.meals.map((meal, index) => (
            <DesktopMealCard
              key={`${meal.type}-${meal.recipe.id}`}
              meal={meal}
              onToggleEaten={() => toggleMealEaten(index)}
              onSwap={(recipe) => swapMeal(index, recipe)}
              onOpenSwapPanel={() => setSwapPanel({ open: true, mealIndex: index, mealType: meal.type })}
            />
          ))}
        </div>

        {/* Mobile Horizontal Scroll */}
        <div className="lg:hidden py-6">
          <div 
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="flex gap-4 px-4 overflow-x-auto hide-scrollbar snap-x snap-mandatory scroll-smooth pb-4"
          >
            {dayPlan.meals.map((meal, index) => (
              <MobileMealCard
                key={`${meal.type}-${meal.recipe.id}`}
                meal={meal}
                onToggleEaten={() => toggleMealEaten(index)}
                onSwap={(recipe) => swapMeal(index, recipe)}
                onOpenSwapPanel={() => setSwapPanel({ open: true, mealIndex: index, mealType: meal.type })}
              />
            ))}
          </div>

          {/* Dots Indicator */}
          <div className="flex items-center justify-center gap-2 mt-2">
            {dayPlan.meals.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  if (scrollContainerRef.current) {
                    scrollContainerRef.current.scrollTo({
                      left: index * 316,
                      behavior: 'smooth'
                    });
                  }
                }}
                className={`h-2 rounded-full transition-all ${
                  index === activeMealIndex ? 'w-6 bg-teal-600' : 'w-2 bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Daily Summary & Water Tracker */}
        <div className="px-4 lg:px-0">
          <div className="grid lg:grid-cols-2 gap-4 lg:gap-6 max-w-4xl lg:max-w-none mx-auto">
            {/* Daily Summary */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-4 text-lg">Tagesübersicht</h3>
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-2xl lg:text-3xl font-bold text-teal-600">{dayPlan.totalCalories}</p>
                  <p className="text-xs lg:text-sm text-gray-500">kcal</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl lg:text-3xl font-bold text-red-500">{dayPlan.totalMacros.protein}g</p>
                  <p className="text-xs lg:text-sm text-gray-500">Protein</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl lg:text-3xl font-bold text-yellow-500">{dayPlan.totalMacros.carbs}g</p>
                  <p className="text-xs lg:text-sm text-gray-500">Kohlenh.</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl lg:text-3xl font-bold text-blue-500">{dayPlan.totalMacros.fat}g</p>
                  <p className="text-xs lg:text-sm text-gray-500">Fett</p>
                </div>
              </div>
              
              {/* Progress bar */}
              <div className="mt-4">
                <div className="flex justify-between text-sm text-gray-500 mb-1">
                  <span>Kalorienziel</span>
                  <span>{Math.round((dayPlan.totalCalories / profile.targetCalories!) * 100)}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-teal-400 to-teal-600 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min((dayPlan.totalCalories / profile.targetCalories!) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Water Tracker */}
            <WaterTracker goal={waterGoal} date={getDateString(currentDate)} />
          </div>
        </div>
      </div>

      {/* Bottom Nav - Mobile Only */}
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

      {/* Regenerate Confirmation Modal */}
      <BottomNav />
    </div>
  );
}
