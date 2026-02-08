export interface Ingredient {
  name: string;
  amount: number;
  unit: string;
  category: string;
}

export interface Nutrition {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

export interface Recipe {
  id: string;
  name: string;
  category: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  tags: string[];
  prepTime: number;
  cookTime: number;
  totalTime: number;
  difficulty: 'easy' | 'medium' | 'hard';
  servings: number;
  image: string;
  ingredients: Ingredient[];
  nutrition: Nutrition;
  instructions: string[];
  allergens: string[];
  dietaryFlags: string[];
  mealPrepable: boolean;
  storageDays: number;
}

export interface UserProfile {
  // Step 1: Personal Data
  gender: 'male' | 'female' | 'other';
  age: number;
  height: number;
  weight: number;
  targetWeight: number;
  bodyFat?: number;

  // Step 2: Goal
  goal: 'lose' | 'gain' | 'maintain' | 'define' | 'performance';

  // Step 3: Activity Level
  occupation: 'sedentary' | 'standing' | 'active' | 'heavy';
  sportsFrequency: number;
  sportsTypes: string[];
  dailyActivity: 'low' | 'moderate' | 'high';

  // Step 4: Diet Type
  dietType: 'mixed' | 'vegetarian' | 'vegan' | 'pescatarian' | 'lowcarb' | 'highprotein' | 'keto' | 'paleo' | 'if16-8' | 'if5-2' | 'omad';

  // Step 5: Allergies
  allergies: string[];

  // Step 6: Food Preferences
  excludedFoods: string[];
  preferredFoods: string[];

  // Step 7: Practicality
  cookingEffort: 'minimal' | 'normal' | 'elaborate';
  mealPrep: boolean;
  lunchOption: 'home' | 'prep' | 'none';
  workType: 'homeoffice' | 'office' | 'mobile' | 'shift';

  // Step 8: Meal Structure
  meals: {
    breakfast: boolean | 'weekend';
    morningSnack: boolean;
    lunch: boolean;
    afternoonSnack: boolean;
    dinner: boolean;
    lateSnack: boolean;
  };

  // Step 9: Household
  householdSize: number;
  hasChildren: boolean;
  childrenAges?: number[];
  budget: 'cheap' | 'normal' | 'any';

  // Calculated
  tdee?: number;
  targetCalories?: number;
  macros?: {
    protein: number;
    carbs: number;
    fat: number;
  };
}

export interface DayPlan {
  date: string;
  meals: MealPlan[];
  totalCalories: number;
  totalMacros: Nutrition;
  waterIntake: number;
  waterGoal: number;
}

export interface MealPlan {
  type: 'breakfast' | 'morningSnack' | 'lunch' | 'afternoonSnack' | 'dinner' | 'lateSnack';
  time: string;
  recipe: Recipe;
  eaten: boolean;
  favorite: boolean;
  alternatives: Recipe[];
}

export interface ShoppingItem {
  name: string;
  amount: number;
  unit: string;
  category: string;
  checked: boolean;
}
