'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import BottomNav from '@/components/BottomNav';
import MealCard from '@/components/MealCard';
import WaterTracker from '@/components/WaterTracker';
import { loadProfile, loadDayPlan, saveDayPlan } from '@/lib/storage';
import { generateDayPlan } from '@/lib/mealPlanGenerator';
import { formatDateGerman, calculateWaterGoal } from '@/lib/calculations';
import { UserProfile, DayPlan, Recipe } from '@/types';

function getDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

export default function PlanPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dayPlan, setDayPlan] = useState<DayPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
  }, [profile, currentDate]);

  const navigateDay = (direction: number) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + direction);
    setCurrentDate(newDate);
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
    updatedMeals[mealIndex] = {
      ...updatedMeals[mealIndex],
      recipe: newRecipe,
      alternatives: [oldRecipe, ...updatedMeals[mealIndex].alternatives.filter(r => r.id !== newRecipe.id)].slice(0, 2),
    };

    // Recalculate totals
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const isToday = getDateString(currentDate) === getDateString(new Date());
  const caloriesEaten = dayPlan.meals
    .filter(m => m.eaten)
    .reduce((sum, m) => sum + m.recipe.nutrition.calories, 0);
  const calorieProgress = (caloriesEaten / (profile.targetCalories || 2000)) * 100;
  const waterGoal = calculateWaterGoal(profile.weight, profile.sportsFrequency);

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="sticky top-0 bg-dark-900/95 backdrop-blur-lg z-10 px-6 py-4 border-b border-dark-800">
        {/* Date Navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigateDay(-1)}
            className="p-2 rounded-lg bg-dark-800 hover:bg-dark-700"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <div className="text-center">
            <p className="font-semibold">{formatDateGerman(currentDate)}</p>
            {isToday && <p className="text-xs text-primary-400">Heute</p>}
          </div>

          <button
            onClick={() => navigateDay(1)}
            className="p-2 rounded-lg bg-dark-800 hover:bg-dark-700"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Calorie Progress */}
        <div className="glass rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-dark-400">Kalorien heute</span>
            <span className="font-semibold">
              {caloriesEaten} / {profile.targetCalories} kcal
            </span>
          </div>
          <div className="h-3 bg-dark-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                calorieProgress > 100
                  ? 'bg-gradient-to-r from-red-500 to-red-400'
                  : 'bg-gradient-to-r from-primary-500 to-primary-400'
              }`}
              style={{ width: `${Math.min(calorieProgress, 100)}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-dark-400">
            <span>
              P: {dayPlan.meals.filter(m => m.eaten).reduce((s, m) => s + m.recipe.nutrition.protein, 0)}g / {profile.macros?.protein}g
            </span>
            <span>
              K: {dayPlan.meals.filter(m => m.eaten).reduce((s, m) => s + m.recipe.nutrition.carbs, 0)}g / {profile.macros?.carbs}g
            </span>
            <span>
              F: {dayPlan.meals.filter(m => m.eaten).reduce((s, m) => s + m.recipe.nutrition.fat, 0)}g / {profile.macros?.fat}g
            </span>
          </div>
        </div>
      </div>

      {/* Meals */}
      <div className="px-6 py-4">
        {dayPlan.meals.map((meal, index) => (
          <MealCard
            key={`${meal.type}-${meal.recipe.id}`}
            type={meal.type}
            time={meal.time}
            recipe={meal.recipe}
            eaten={meal.eaten}
            onToggleEaten={() => toggleMealEaten(index)}
            alternatives={meal.alternatives}
            onSwap={(recipe) => swapMeal(index, recipe)}
          />
        ))}

        {/* Water Tracker */}
        <div className="mt-4">
          <WaterTracker goal={waterGoal} date={getDateString(currentDate)} />
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
