import { UserProfile } from '@/types';

// Mifflin-St Jeor Equation for BMR
export function calculateBMR(gender: string, weight: number, height: number, age: number): number {
  if (gender === 'male') {
    return 10 * weight + 6.25 * height - 5 * age + 5;
  } else {
    return 10 * weight + 6.25 * height - 5 * age - 161;
  }
}

// Activity multiplier based on lifestyle
export function getActivityMultiplier(occupation: string, dailyActivity: string, sportsFrequency: number): number {
  let base = 1.2; // Sedentary

  // Occupation adjustment
  switch (occupation) {
    case 'standing': base = 1.3; break;
    case 'active': base = 1.5; break;
    case 'heavy': base = 1.7; break;
  }

  // Daily activity adjustment
  switch (dailyActivity) {
    case 'moderate': base += 0.1; break;
    case 'high': base += 0.2; break;
  }

  // Sports frequency adjustment
  base += (sportsFrequency * 0.05);

  return Math.min(base, 2.2); // Cap at very active
}

// Calculate TDEE (Total Daily Energy Expenditure)
export function calculateTDEE(profile: UserProfile): number {
  const bmr = calculateBMR(profile.gender, profile.weight, profile.height, profile.age);
  const multiplier = getActivityMultiplier(profile.occupation, profile.dailyActivity, profile.sportsFrequency);
  return Math.round(bmr * multiplier);
}

// Calculate target calories based on goal
export function calculateTargetCalories(tdee: number, goal: string): number {
  switch (goal) {
    case 'lose': return tdee - 500; // ~0.5kg/week loss
    case 'gain': return tdee + 300; // Lean bulk
    case 'define': return tdee - 300; // Slight deficit
    case 'performance': return tdee + 200; // Performance focus
    default: return tdee; // maintain
  }
}

// Calculate macros based on goal
export function calculateMacros(targetCalories: number, goal: string, weight: number) {
  let proteinRatio: number, carbsRatio: number, fatRatio: number;

  switch (goal) {
    case 'lose':
      proteinRatio = 0.35; // Higher protein for muscle preservation
      carbsRatio = 0.35;
      fatRatio = 0.30;
      break;
    case 'gain':
      proteinRatio = 0.25;
      carbsRatio = 0.50;
      fatRatio = 0.25;
      break;
    case 'define':
      proteinRatio = 0.40;
      carbsRatio = 0.30;
      fatRatio = 0.30;
      break;
    case 'performance':
      proteinRatio = 0.25;
      carbsRatio = 0.55;
      fatRatio = 0.20;
      break;
    default: // maintain
      proteinRatio = 0.25;
      carbsRatio = 0.45;
      fatRatio = 0.30;
  }

  // Minimum protein: 1.6g per kg body weight for active people
  const minProtein = weight * 1.6;
  const calculatedProtein = (targetCalories * proteinRatio) / 4;
  const protein = Math.max(minProtein, calculatedProtein);

  // Adjust other macros if protein was bumped up
  const proteinCalories = protein * 4;
  const remainingCalories = targetCalories - proteinCalories;
  const totalOtherRatio = carbsRatio + fatRatio;

  const carbs = (remainingCalories * (carbsRatio / totalOtherRatio)) / 4;
  const fat = (remainingCalories * (fatRatio / totalOtherRatio)) / 9;

  return {
    protein: Math.round(protein),
    carbs: Math.round(carbs),
    fat: Math.round(fat),
  };
}

// Calculate water goal based on weight and activity
export function calculateWaterGoal(weight: number, sportsFrequency: number): number {
  const base = weight * 0.033; // 33ml per kg
  const sportBonus = sportsFrequency * 0.15; // Extra per workout
  return Math.round((base + sportBonus) * 10) / 10; // Round to 1 decimal
}

// Get goal label in German
export function getGoalLabel(goal: string): string {
  const labels: Record<string, string> = {
    'lose': 'Abnehmen',
    'gain': 'Muskelaufbau',
    'maintain': 'Gewicht halten',
    'define': 'Definition',
    'performance': 'Leistung steigern',
  };
  return labels[goal] || goal;
}

// Get diet type label
export function getDietLabel(diet: string): string {
  const labels: Record<string, string> = {
    'mixed': 'Mischkost',
    'vegetarian': 'Vegetarisch',
    'vegan': 'Vegan',
    'pescatarian': 'Pescetarisch',
    'lowcarb': 'Low Carb',
    'highprotein': 'High Protein',
    'keto': 'Ketogen',
    'paleo': 'Paleo',
    'if16-8': 'Intervallfasten 16:8',
    'if5-2': 'Intervallfasten 5:2',
    'omad': 'OMAD',
  };
  return labels[diet] || diet;
}

// Format date in German
export function formatDateGerman(date: Date): string {
  const days = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  const months = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  
  return `${days[date.getDay()]}, ${date.getDate()}. ${months[date.getMonth()]} ${date.getFullYear()}`;
}
