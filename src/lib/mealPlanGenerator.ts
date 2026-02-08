import { Recipe, UserProfile, DayPlan, MealPlan } from '@/types';
import recipesData from '@/data/recipes.json';

const recipes = recipesData as Recipe[];

// Get recipes by category
function getRecipesByCategory(category: string): Recipe[] {
  return recipes.filter(r => r.category === category);
}

// Filter recipes based on user preferences
function filterRecipesForUser(recipes: Recipe[], profile: UserProfile): Recipe[] {
  return recipes.filter(recipe => {
    // Check allergies
    if (profile.allergies?.some(a => recipe.allergens.includes(a))) {
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

// Generate meal plan for a day
export function generateDayPlan(date: string, profile: UserProfile): DayPlan {
  const usedIds: string[] = [];
  const meals: MealPlan[] = [];

  // Filter all recipes for user
  const breakfasts = filterRecipesForUser(getRecipesByCategory('breakfast'), profile);
  const lunches = filterRecipesForUser(getRecipesByCategory('lunch'), profile);
  const dinners = filterRecipesForUser(getRecipesByCategory('dinner'), profile);
  const snacks = filterRecipesForUser(getRecipesByCategory('snack'), profile);

  // Calculate target calories per meal
  const _totalMeals = Object.values(profile.meals || {}).filter(v => v === true).length;
  const _mainMealRatio = 0.3;
  const _snackRatio = 0.1;

  if (profile.meals?.breakfast) {
    const recipe = selectRecipe(breakfasts, usedIds);
    if (recipe) {
      usedIds.push(recipe.id);
      meals.push({
        type: 'breakfast',
        time: '07:30',
        recipe,
        eaten: false,
        favorite: false,
        alternatives: getAlternatives(recipe, breakfasts),
      });
    }
  }

  if (profile.meals?.morningSnack) {
    const recipe = selectRecipe(snacks, usedIds);
    if (recipe) {
      usedIds.push(recipe.id);
      meals.push({
        type: 'morningSnack',
        time: '10:00',
        recipe,
        eaten: false,
        favorite: false,
        alternatives: getAlternatives(recipe, snacks),
      });
    }
  }

  if (profile.meals?.lunch) {
    const recipe = selectRecipe(lunches, usedIds);
    if (recipe) {
      usedIds.push(recipe.id);
      meals.push({
        type: 'lunch',
        time: '12:30',
        recipe,
        eaten: false,
        favorite: false,
        alternatives: getAlternatives(recipe, lunches),
      });
    }
  }

  if (profile.meals?.afternoonSnack) {
    const recipe = selectRecipe(snacks, usedIds);
    if (recipe) {
      usedIds.push(recipe.id);
      meals.push({
        type: 'afternoonSnack',
        time: '15:30',
        recipe,
        eaten: false,
        favorite: false,
        alternatives: getAlternatives(recipe, snacks),
      });
    }
  }

  if (profile.meals?.dinner) {
    const recipe = selectRecipe(dinners, usedIds);
    if (recipe) {
      usedIds.push(recipe.id);
      meals.push({
        type: 'dinner',
        time: '19:00',
        recipe,
        eaten: false,
        favorite: false,
        alternatives: getAlternatives(recipe, dinners),
      });
    }
  }

  if (profile.meals?.lateSnack) {
    const recipe = selectRecipe(snacks, usedIds);
    if (recipe) {
      usedIds.push(recipe.id);
      meals.push({
        type: 'lateSnack',
        time: '21:00',
        recipe,
        eaten: false,
        favorite: false,
        alternatives: getAlternatives(recipe, snacks),
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

// Get recipe by ID
export function getRecipeById(id: string): Recipe | undefined {
  return recipes.find(r => r.id === id);
}

// Get all recipes
export function getAllRecipes(): Recipe[] {
  return recipes;
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
