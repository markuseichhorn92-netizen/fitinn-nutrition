import { Recipe, UserProfile, DayPlan, MealPlan } from '@/types';
import recipesData from '@/data/recipes.json';

const mockRecipes = recipesData as Recipe[];

// Get recipes by category (from cache or fallback)
function getRecipesByCategory(recipes: Recipe[], category: string): Recipe[] {
  return recipes.filter(r => r.category === category);
}

// Filter recipes based on user preferences
function filterRecipesForUser(recipes: Recipe[], profile: UserProfile): Recipe[] {
  return recipes.filter(recipe => {
    // Check allergies
    if (profile.allergies?.some(a => recipe.allergens.includes(a))) {
      return false;
    }

    // Check excluded foods
    if (profile.excludedFoods?.some(food => 
      recipe.ingredients.some(ing => ing.name.toLowerCase().includes(food.toLowerCase()))
    )) {
      return false;
    }

    // Check diet type
    if (profile.dietType === 'vegetarian' && !recipe.dietaryFlags.includes('vegetarian')) {
      return false;
    }
    if (profile.dietType === 'vegan' && !recipe.dietaryFlags.includes('vegan')) {
      return false;
    }

    // Check cooking effort
    if (profile.cookingEffort === 'minimal' && recipe.totalTime > 15) {
      return false;
    }
    if (profile.cookingEffort === 'normal' && recipe.totalTime > 30) {
      return false;
    }

    return true;
  });
}

// Scale a recipe to target calories
export function scaleRecipe(recipe: Recipe, targetCals: number): Recipe {
  if (!targetCals || targetCals <= 0 || recipe.nutrition.calories <= 0) return recipe;
  const scale = targetCals / recipe.nutrition.calories;
  // Don't scale more than 3x or less than 0.3x (would be weird portions)
  const clampedScale = Math.max(0.3, Math.min(3.0, scale));
  return {
    ...recipe,
    servings: Math.round(recipe.servings * clampedScale * 10) / 10,
    ingredients: recipe.ingredients.map(ing => ({
      ...ing,
      amount: Math.round(ing.amount * clampedScale * 10) / 10,
    })),
    nutrition: {
      calories: Math.round(recipe.nutrition.calories * clampedScale),
      protein: Math.round(recipe.nutrition.protein * clampedScale),
      carbs: Math.round(recipe.nutrition.carbs * clampedScale),
      fat: Math.round(recipe.nutrition.fat * clampedScale),
      fiber: Math.round(recipe.nutrition.fiber * clampedScale),
    },
  };
}

// Select best recipe closest to target calories
function selectRecipeForTarget(recipes: Recipe[], usedIds: string[], targetCals: number): Recipe | null {
  const available = recipes.filter(r => !usedIds.includes(r.id));
  if (available.length === 0) return recipes[0] || null;
  // Sort by how close to target (prefer recipes that need less scaling)
  available.sort((a, b) => {
    const diffA = Math.abs(a.nutrition.calories - targetCals);
    const diffB = Math.abs(b.nutrition.calories - targetCals);
    return diffA - diffB;
  });
  // Pick from top 3 closest (some randomness)
  const top = available.slice(0, Math.min(3, available.length));
  return top[Math.floor(Math.random() * top.length)];
}

// Select a random recipe from filtered list
function selectRecipe(recipes: Recipe[], usedIds: string[] = []): Recipe | null {
  const available = recipes.filter(r => !usedIds.includes(r.id));
  if (available.length === 0) return recipes[0] || null;
  return available[Math.floor(Math.random() * available.length)];
}

// Get alternatives for a recipe
function getAlternatives(recipe: Recipe, allRecipes: Recipe[], count: number = 2): Recipe[] {
  const sameCategory = allRecipes.filter(
    r => r.category === recipe.category && r.id !== recipe.id
  );
  
  // Sort by calorie similarity
  sameCategory.sort((a, b) => {
    const diffA = Math.abs(a.nutrition.calories - recipe.nutrition.calories);
    const diffB = Math.abs(b.nutrition.calories - recipe.nutrition.calories);
    return diffA - diffB;
  });

  return sameCategory.slice(0, count);
}

function getRecipesSync(): Recipe[] {
  return mockRecipes;
}

// Generate meal plan for a day
export function generateDayPlan(date: string, profile: UserProfile): DayPlan {
  // Use cached/mock recipes synchronously for initial render
  const recipes = getRecipesSync();
  
  const usedIds: string[] = [];
  const meals: MealPlan[] = [];

  // Filter all recipes for user
  const breakfasts = filterRecipesForUser(getRecipesByCategory(recipes, 'breakfast'), profile);
  const lunches = filterRecipesForUser(getRecipesByCategory(recipes, 'lunch'), profile);
  const dinners = filterRecipesForUser(getRecipesByCategory(recipes, 'dinner'), profile);
  const snacks = filterRecipesForUser(getRecipesByCategory(recipes, 'snack'), profile);

  // Calculate target calories per meal type
  const targetCalories = profile.targetCalories || profile.tdee || 2000;
  const activeMeals = Object.entries(profile.meals || {}).filter(([, v]) => v === true);
  const mainMealTypes = ['breakfast', 'lunch', 'dinner'];
  const mainMealCount = activeMeals.filter(([k]) => mainMealTypes.includes(k)).length;
  const snackCount = activeMeals.length - mainMealCount;
  // Main meals get ~30% each, snacks ~10% each (adjusted to fill 100%)
  const totalRatio = mainMealCount * 0.3 + snackCount * 0.1;
  const mainCalTarget = (targetCalories * 0.3) / (totalRatio || 1) * (totalRatio);
  const snackCalTarget = (targetCalories * 0.1) / (totalRatio || 1) * (totalRatio);

  // Per-meal calorie targets
  const mainTarget = targetCalories * 0.3 / (totalRatio || 1);
  const snackTarget = targetCalories * 0.1 / (totalRatio || 1);

  if (profile.meals?.breakfast) {
    const raw = selectRecipeForTarget(breakfasts, usedIds, mainTarget);
    if (raw) {
      const recipe = scaleRecipe(raw, mainTarget);
      usedIds.push(raw.id);
      meals.push({
        type: 'breakfast',
        time: '07:30',
        recipe,
        eaten: false,
        favorite: false,
        alternatives: getAlternatives(raw, breakfasts),
      });
    }
  }

  if (profile.meals?.morningSnack) {
    const raw = selectRecipeForTarget(snacks, usedIds, snackTarget);
    if (raw) {
      const recipe = scaleRecipe(raw, snackTarget);
      usedIds.push(raw.id);
      meals.push({
        type: 'morningSnack',
        time: '10:00',
        recipe,
        eaten: false,
        favorite: false,
        alternatives: getAlternatives(raw, snacks),
      });
    }
  }

  if (profile.meals?.lunch) {
    const raw = selectRecipeForTarget(lunches, usedIds, mainTarget);
    if (raw) {
      const recipe = scaleRecipe(raw, mainTarget);
      usedIds.push(raw.id);
      meals.push({
        type: 'lunch',
        time: '12:30',
        recipe,
        eaten: false,
        favorite: false,
        alternatives: getAlternatives(raw, lunches),
      });
    }
  }

  if (profile.meals?.afternoonSnack) {
    const raw = selectRecipeForTarget(snacks, usedIds, snackTarget);
    if (raw) {
      const recipe = scaleRecipe(raw, snackTarget);
      usedIds.push(raw.id);
      meals.push({
        type: 'afternoonSnack',
        time: '15:30',
        recipe,
        eaten: false,
        favorite: false,
        alternatives: getAlternatives(raw, snacks),
      });
    }
  }

  if (profile.meals?.dinner) {
    const raw = selectRecipeForTarget(dinners, usedIds, mainTarget);
    if (raw) {
      const recipe = scaleRecipe(raw, mainTarget);
      usedIds.push(raw.id);
      meals.push({
        type: 'dinner',
        time: '19:00',
        recipe,
        eaten: false,
        favorite: false,
        alternatives: getAlternatives(raw, dinners),
      });
    }
  }

  if (profile.meals?.lateSnack) {
    const raw = selectRecipeForTarget(snacks, usedIds, snackTarget);
    if (raw) {
      const recipe = scaleRecipe(raw, snackTarget);
      usedIds.push(raw.id);
      meals.push({
        type: 'lateSnack',
        time: '21:00',
        recipe,
        eaten: false,
        favorite: false,
        alternatives: getAlternatives(raw, snacks),
      });
    }
  }

  // Calculate totals
  const totalCalories = meals.reduce((sum, m) => sum + m.recipe.nutrition.calories, 0);
  const totalMacros = meals.reduce(
    (acc, m) => ({
      calories: acc.calories + m.recipe.nutrition.calories,
      protein: acc.protein + m.recipe.nutrition.protein,
      carbs: acc.carbs + m.recipe.nutrition.carbs,
      fat: acc.fat + m.recipe.nutrition.fat,
      fiber: acc.fiber + m.recipe.nutrition.fiber,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
  );

  return {
    date,
    meals,
    totalCalories,
    totalMacros,
    waterIntake: 0,
    waterGoal: profile.weight ? profile.weight * 0.033 : 2.5,
  };
}

// Async version that fetches fresh recipes
// Get recipe by ID
export function getRecipeById(id: string): Recipe | undefined {
  const recipes = getRecipesSync();
  return recipes.find(r => r.id === id);
}

// Get all recipes
export function getAllRecipes(): Recipe[] {
  return getRecipesSync();
}

// Generate shopping list for a week
export function generateShoppingList(plans: DayPlan[]): Map<string, { amount: number; unit: string; category: string }> {
  const items = new Map<string, { amount: number; unit: string; category: string }>();

  for (const plan of plans) {
    for (const meal of plan.meals) {
      for (const ingredient of meal.recipe.ingredients) {
        const key = ingredient.name.toLowerCase();
        if (items.has(key)) {
          const existing = items.get(key)!;
          existing.amount += ingredient.amount;
        } else {
          items.set(key, {
            amount: ingredient.amount,
            unit: ingredient.unit,
            category: ingredient.category,
          });
        }
      }
    }
  }

  return items;
}


