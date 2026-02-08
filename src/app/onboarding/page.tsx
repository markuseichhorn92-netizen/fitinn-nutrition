'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserProfile } from '@/types';
import { saveProfile } from '@/lib/storage';
import { calculateTDEE, calculateTargetCalories, calculateMacros, calculateWaterGoal, getGoalLabel, getDietLabel } from '@/lib/calculations';

const steps = [
  'Persönliche Daten',
  'Dein Ziel',
  'Aktivitätslevel',
  'Ernährungsform',
  'Allergien',
  'Lebensmittel',
  'Alltagstauglichkeit',
  'Mahlzeiten',
  'Haushalt',
  'Zusammenfassung',
];

const allergiesOptions = [
  { id: 'lactose', label: 'Laktoseintoleranz', emoji: '🥛' },
  { id: 'gluten', label: 'Glutenunverträglichkeit', emoji: '🌾' },
  { id: 'nuts', label: 'Nussallergie', emoji: '🥜' },
  { id: 'soy', label: 'Sojaallergie', emoji: '🫘' },
  { id: 'fish', label: 'Fischallergie', emoji: '🐟' },
  { id: 'eggs', label: 'Eiallergie', emoji: '🥚' },
  { id: 'histamine', label: 'Histaminintoleranz', emoji: '⚠️' },
  { id: 'fructose', label: 'Fruktoseintoleranz', emoji: '🍎' },
];

const commonFoods = [
  { id: 'brokkoli', label: 'Brokkoli', category: 'Gemüse' },
  { id: 'spinat', label: 'Spinat', category: 'Gemüse' },
  { id: 'pilze', label: 'Pilze', category: 'Gemüse' },
  { id: 'innereien', label: 'Innereien', category: 'Fleisch' },
  { id: 'oliven', label: 'Oliven', category: 'Gemüse' },
  { id: 'aubergine', label: 'Aubergine', category: 'Gemüse' },
  { id: 'rosenkohl', label: 'Rosenkohl', category: 'Gemüse' },
  { id: 'huhn', label: 'Hähnchen', category: 'Fleisch' },
  { id: 'lachs', label: 'Lachs', category: 'Fisch' },
  { id: 'tofu', label: 'Tofu', category: 'Soja' },
  { id: 'avocado', label: 'Avocado', category: 'Obst' },
  { id: 'susskartoffel', label: 'Süßkartoffel', category: 'Gemüse' },
];

const initialProfile: Partial<UserProfile> = {
  gender: 'male',
  age: 30,
  height: 175,
  weight: 80,
  targetWeight: 75,
  goal: 'lose',
  occupation: 'sedentary',
  sportsFrequency: 3,
  sportsTypes: [],
  dailyActivity: 'moderate',
  dietType: 'mixed',
  allergies: [],
  excludedFoods: [],
  preferredFoods: [],
  cookingEffort: 'normal',
  mealPrep: false,
  lunchOption: 'home',
  workType: 'office',
  meals: {
    breakfast: true,
    morningSnack: false,
    lunch: true,
    afternoonSnack: true,
    dinner: true,
    lateSnack: false,
  },
  householdSize: 1,
  hasChildren: false,
  budget: 'normal',
};

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<Partial<UserProfile>>(initialProfile);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateProfile = (updates: Partial<UserProfile>) => {
    setProfile(prev => ({ ...prev, ...updates }));
  };

  const nextStep = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    }
  };

  const prevStep = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    const tdee = calculateTDEE(profile as UserProfile);
    const targetCalories = calculateTargetCalories(tdee, profile.goal || 'maintain');
    const macros = calculateMacros(targetCalories, profile.goal || 'maintain', profile.weight || 75);
    
    const completeProfile: UserProfile = {
      ...profile as UserProfile,
      tdee,
      targetCalories,
      macros,
    };
    
    saveProfile(completeProfile);
    
    await new Promise(resolve => setTimeout(resolve, 500));
    router.push('/plan');
  };

  const progress = ((step + 1) / steps.length) * 100;

  const tdee = calculateTDEE(profile as UserProfile);
  const targetCalories = calculateTargetCalories(tdee, profile.goal || 'maintain');
  const macros = calculateMacros(targetCalories, profile.goal || 'maintain', profile.weight || 75);
  const waterGoal = calculateWaterGoal(profile.weight || 75, profile.sportsFrequency || 3);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Progress Header */}
      <div className="sticky top-0 bg-white z-10 px-6 py-4 border-b border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-500">Schritt {step + 1} von {steps.length}</span>
          <span className="text-sm font-medium text-teal-600">{steps[step]}</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-teal-500 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 py-6 pb-24">
        {/* Step 1: Personal Data */}
        {step === 0 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Erzähl uns von dir</h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Geschlecht</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'male', label: 'Männlich', emoji: '👨' },
                  { value: 'female', label: 'Weiblich', emoji: '👩' },
                  { value: 'other', label: 'Divers', emoji: '🧑' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => updateProfile({ gender: opt.value as UserProfile['gender'] })}
                    className={`p-4 rounded-xl text-center transition-all ${
                      profile.gender === opt.value
                        ? 'bg-teal-50 border-2 border-teal-500'
                        : 'bg-gray-50 border-2 border-transparent hover:border-gray-200'
                    }`}
                  >
                    <span className="text-2xl mb-2 block">{opt.emoji}</span>
                    <span className="text-sm text-gray-700">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Alter</label>
                <input
                  type="number"
                  value={profile.age}
                  onChange={(e) => updateProfile({ age: parseInt(e.target.value) })}
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none text-gray-900"
                  min={14}
                  max={100}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Größe (cm)</label>
                <input
                  type="number"
                  value={profile.height}
                  onChange={(e) => updateProfile({ height: parseInt(e.target.value) })}
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none text-gray-900"
                  min={120}
                  max={230}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Gewicht (kg)</label>
                <input
                  type="number"
                  value={profile.weight}
                  onChange={(e) => updateProfile({ weight: parseInt(e.target.value) })}
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none text-gray-900"
                  min={40}
                  max={250}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Zielgewicht (kg)</label>
                <input
                  type="number"
                  value={profile.targetWeight}
                  onChange={(e) => updateProfile({ targetWeight: parseInt(e.target.value) })}
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none text-gray-900"
                  min={40}
                  max={200}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Goal */}
        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Was ist dein Ziel?</h2>
            
            <div className="space-y-3">
              {[
                { value: 'lose', label: 'Abnehmen', emoji: '🔥', desc: 'Fett verbrennen, Gewicht reduzieren' },
                { value: 'gain', label: 'Muskelaufbau', emoji: '💪', desc: 'Muskelmasse aufbauen' },
                { value: 'maintain', label: 'Gewicht halten', emoji: '⚖️', desc: 'Gesund essen, Gewicht stabilisieren' },
                { value: 'define', label: 'Definition', emoji: '🏋️', desc: 'Muskeln definieren, Fett reduzieren' },
                { value: 'performance', label: 'Leistung steigern', emoji: '🏃', desc: 'Energie für sportliche Ziele' },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => updateProfile({ goal: opt.value as UserProfile['goal'] })}
                  className={`w-full p-4 rounded-xl flex items-center gap-4 text-left transition-all ${
                    profile.goal === opt.value
                      ? 'bg-teal-50 border-2 border-teal-500'
                      : 'bg-gray-50 border-2 border-transparent hover:border-gray-200'
                  }`}
                >
                  <span className="text-3xl">{opt.emoji}</span>
                  <div>
                    <p className="font-semibold text-gray-900">{opt.label}</p>
                    <p className="text-sm text-gray-500">{opt.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Activity Level */}
        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Wie aktiv bist du?</h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Berufliche Tätigkeit</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'sedentary', label: 'Sitzend', emoji: '💻' },
                  { value: 'standing', label: 'Stehend', emoji: '🧍' },
                  { value: 'active', label: 'Aktiv', emoji: '🚶' },
                  { value: 'heavy', label: 'Körperlich schwer', emoji: '🏗️' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => updateProfile({ occupation: opt.value as UserProfile['occupation'] })}
                    className={`p-4 rounded-xl text-center transition-all ${
                      profile.occupation === opt.value
                        ? 'bg-teal-50 border-2 border-teal-500'
                        : 'bg-gray-50 border-2 border-transparent hover:border-gray-200'
                    }`}
                  >
                    <span className="text-2xl mb-2 block">{opt.emoji}</span>
                    <span className="text-sm text-gray-700">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Wie oft trainierst du pro Woche?
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min={0}
                  max={7}
                  value={profile.sportsFrequency}
                  onChange={(e) => updateProfile({ sportsFrequency: parseInt(e.target.value) })}
                  className="flex-1 accent-teal-500"
                />
                <span className="text-2xl font-bold text-teal-600 w-12 text-center">
                  {profile.sportsFrequency}x
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Alltagsaktivität</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'low', label: 'Wenig', emoji: '🛋️' },
                  { value: 'moderate', label: 'Moderat', emoji: '🚶' },
                  { value: 'high', label: 'Viel', emoji: '🏃' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => updateProfile({ dailyActivity: opt.value as UserProfile['dailyActivity'] })}
                    className={`p-4 rounded-xl text-center transition-all ${
                      profile.dailyActivity === opt.value
                        ? 'bg-teal-50 border-2 border-teal-500'
                        : 'bg-gray-50 border-2 border-transparent hover:border-gray-200'
                    }`}
                  >
                    <span className="text-2xl mb-2 block">{opt.emoji}</span>
                    <span className="text-sm text-gray-700">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Diet Type */}
        {step === 3 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Deine Ernährungsform</h2>
            
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'mixed', label: 'Mischkost', emoji: '🍽️' },
                { value: 'vegetarian', label: 'Vegetarisch', emoji: '🥗' },
                { value: 'vegan', label: 'Vegan', emoji: '🌱' },
                { value: 'pescatarian', label: 'Pescetarisch', emoji: '🐟' },
                { value: 'lowcarb', label: 'Low Carb', emoji: '🥩' },
                { value: 'highprotein', label: 'High Protein', emoji: '💪' },
                { value: 'keto', label: 'Ketogen', emoji: '🥓' },
                { value: 'paleo', label: 'Paleo', emoji: '🦴' },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => updateProfile({ dietType: opt.value as UserProfile['dietType'] })}
                  className={`p-4 rounded-xl text-center transition-all ${
                    profile.dietType === opt.value
                      ? 'bg-teal-50 border-2 border-teal-500'
                      : 'bg-gray-50 border-2 border-transparent hover:border-gray-200'
                  }`}
                >
                  <span className="text-2xl mb-2 block">{opt.emoji}</span>
                  <span className="text-sm text-gray-700">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 5: Allergies */}
        {step === 4 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold mb-2 text-gray-900">Allergien & Unverträglichkeiten</h2>
            <p className="text-gray-500 mb-6">Wähle alles aus, was auf dich zutrifft</p>
            
            <div className="space-y-3">
              {allergiesOptions.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => {
                    const allergies = profile.allergies || [];
                    const updated = allergies.includes(opt.id)
                      ? allergies.filter(a => a !== opt.id)
                      : [...allergies, opt.id];
                    updateProfile({ allergies: updated });
                  }}
                  className={`w-full p-4 rounded-xl flex items-center gap-4 text-left transition-all ${
                    profile.allergies?.includes(opt.id)
                      ? 'bg-red-50 border-2 border-red-400'
                      : 'bg-gray-50 border-2 border-transparent hover:border-gray-200'
                  }`}
                >
                  <span className="text-2xl">{opt.emoji}</span>
                  <span className="flex-1 text-gray-700">{opt.label}</span>
                  {profile.allergies?.includes(opt.id) && (
                    <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 6: Food Preferences */}
        {step === 5 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold mb-2 text-gray-900">Lebensmittel-Präferenzen</h2>
            <p className="text-gray-500 mb-6">Was magst du nicht?</p>
            
            <div className="flex flex-wrap gap-2">
              {commonFoods.map(food => (
                <button
                  key={food.id}
                  onClick={() => {
                    const excluded = profile.excludedFoods || [];
                    const updated = excluded.includes(food.id)
                      ? excluded.filter(f => f !== food.id)
                      : [...excluded, food.id];
                    updateProfile({ excludedFoods: updated });
                  }}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    profile.excludedFoods?.includes(food.id)
                      ? 'bg-red-100 text-red-600 border border-red-300'
                      : 'bg-gray-100 text-gray-600 border border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {food.label}
                  {profile.excludedFoods?.includes(food.id) && ' ✕'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 7: Practicality */}
        {step === 6 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Alltagstauglichkeit</h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Kochaufwand</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'minimal', label: '<10 Min', emoji: '⚡' },
                  { value: 'normal', label: '<20 Min', emoji: '👍' },
                  { value: 'elaborate', label: '<45 Min', emoji: '👨‍🍳' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => updateProfile({ cookingEffort: opt.value as UserProfile['cookingEffort'] })}
                    className={`p-4 rounded-xl text-center transition-all ${
                      profile.cookingEffort === opt.value
                        ? 'bg-teal-50 border-2 border-teal-500'
                        : 'bg-gray-50 border-2 border-transparent hover:border-gray-200'
                    }`}
                  >
                    <span className="text-2xl mb-2 block">{opt.emoji}</span>
                    <span className="text-sm text-gray-700">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Meal Prep?</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => updateProfile({ mealPrep: true })}
                  className={`p-4 rounded-xl text-center transition-all ${
                    profile.mealPrep
                      ? 'bg-teal-50 border-2 border-teal-500'
                      : 'bg-gray-50 border-2 border-transparent hover:border-gray-200'
                  }`}
                >
                  <span className="text-2xl mb-2 block">📦</span>
                  <span className="text-sm text-gray-700">Ja, vorkochen</span>
                </button>
                <button
                  onClick={() => updateProfile({ mealPrep: false })}
                  className={`p-4 rounded-xl text-center transition-all ${
                    !profile.mealPrep
                      ? 'bg-teal-50 border-2 border-teal-500'
                      : 'bg-gray-50 border-2 border-transparent hover:border-gray-200'
                  }`}
                >
                  <span className="text-2xl mb-2 block">🍳</span>
                  <span className="text-sm text-gray-700">Täglich frisch</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Arbeitsplatz</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'homeoffice', label: 'Home Office', emoji: '🏠' },
                  { value: 'office', label: 'Büro', emoji: '🏢' },
                  { value: 'mobile', label: 'Unterwegs', emoji: '🚗' },
                  { value: 'shift', label: 'Schichtarbeit', emoji: '🔄' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => updateProfile({ workType: opt.value as UserProfile['workType'] })}
                    className={`p-4 rounded-xl text-center transition-all ${
                      profile.workType === opt.value
                        ? 'bg-teal-50 border-2 border-teal-500'
                        : 'bg-gray-50 border-2 border-transparent hover:border-gray-200'
                    }`}
                  >
                    <span className="text-2xl mb-2 block">{opt.emoji}</span>
                    <span className="text-sm text-gray-700">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 8: Meal Structure */}
        {step === 7 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold mb-2 text-gray-900">Deine Mahlzeiten</h2>
            <p className="text-gray-500 mb-6">Welche Mahlzeiten möchtest du planen?</p>
            
            <div className="space-y-3">
              {[
                { key: 'breakfast', label: 'Frühstück', emoji: '🌅', time: '07:00 - 09:00' },
                { key: 'morningSnack', label: 'Vormittags-Snack', emoji: '🍎', time: '10:00 - 11:00' },
                { key: 'lunch', label: 'Mittagessen', emoji: '🍽', time: '12:00 - 14:00' },
                { key: 'afternoonSnack', label: 'Nachmittags-Snack', emoji: '🍏', time: '15:00 - 16:00' },
                { key: 'dinner', label: 'Abendessen', emoji: '🌙', time: '18:00 - 20:00' },
                { key: 'lateSnack', label: 'Spät-Snack', emoji: '🌜', time: '21:00 - 22:00' },
              ].map(meal => (
                <button
                  key={meal.key}
                  onClick={() => {
                    updateProfile({
                      meals: {
                        ...profile.meals!,
                        [meal.key]: !profile.meals![meal.key as keyof typeof profile.meals],
                      },
                    });
                  }}
                  className={`w-full p-4 rounded-xl flex items-center gap-4 text-left transition-all ${
                    profile.meals![meal.key as keyof typeof profile.meals]
                      ? 'bg-teal-50 border-2 border-teal-500'
                      : 'bg-gray-50 border-2 border-transparent hover:border-gray-200'
                  }`}
                >
                  <span className="text-2xl">{meal.emoji}</span>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{meal.label}</p>
                    <p className="text-sm text-gray-500">{meal.time}</p>
                  </div>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    profile.meals![meal.key as keyof typeof profile.meals]
                      ? 'bg-teal-500 border-teal-500'
                      : 'border-gray-300'
                  }`}>
                    {profile.meals![meal.key as keyof typeof profile.meals] && (
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 9: Household */}
        {step === 8 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Dein Haushalt</h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Für wie viele Personen kochst du?
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min={1}
                  max={6}
                  value={profile.householdSize}
                  onChange={(e) => updateProfile({ householdSize: parseInt(e.target.value) })}
                  className="flex-1 accent-teal-500"
                />
                <span className="text-2xl font-bold text-teal-600 w-12 text-center">
                  {profile.householdSize}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Budget</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'cheap', label: 'Günstig', emoji: '💰' },
                  { value: 'normal', label: 'Normal', emoji: '💵' },
                  { value: 'any', label: 'Egal', emoji: '💎' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => updateProfile({ budget: opt.value as UserProfile['budget'] })}
                    className={`p-4 rounded-xl text-center transition-all ${
                      profile.budget === opt.value
                        ? 'bg-teal-50 border-2 border-teal-500'
                        : 'bg-gray-50 border-2 border-transparent hover:border-gray-200'
                    }`}
                  >
                    <span className="text-2xl mb-2 block">{opt.emoji}</span>
                    <span className="text-sm text-gray-700">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 10: Summary */}
        {step === 9 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold mb-2 text-gray-900">Dein Plan ist bereit! 🎉</h2>
            <p className="text-gray-500 mb-6">Hier ist deine Zusammenfassung</p>
            
            {/* Calorie Card */}
            <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl p-6 text-center text-white">
              <p className="text-teal-100 text-sm mb-2">Dein tägliches Kalorienziel</p>
              <p className="text-5xl font-bold mb-2">{targetCalories}</p>
              <p className="text-teal-100 text-sm">kcal pro Tag</p>
              
              <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-teal-400/30">
                <div>
                  <p className="text-2xl font-bold">{macros.protein}g</p>
                  <p className="text-xs text-teal-100">Protein</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{macros.carbs}g</p>
                  <p className="text-xs text-teal-100">Kohlenhydrate</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{macros.fat}g</p>
                  <p className="text-xs text-teal-100">Fett</p>
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-gray-500">Ziel</span>
                <span className="font-medium text-gray-900">{getGoalLabel(profile.goal || '')}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-gray-500">Ernährungsform</span>
                <span className="font-medium text-gray-900">{getDietLabel(profile.dietType || '')}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-gray-500">Grundumsatz (TDEE)</span>
                <span className="font-medium text-gray-900">{tdee} kcal</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-500">Wasserziel</span>
                <span className="font-medium text-gray-900">{waterGoal} L / Tag</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 py-4 flex gap-4">
        {step > 0 && (
          <button
            onClick={prevStep}
            className="flex-1 py-4 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition-colors"
          >
            Zurück
          </button>
        )}
        {step < steps.length - 1 ? (
          <button
            onClick={nextStep}
            className="flex-1 py-4 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 transition-colors"
          >
            Weiter
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 py-4 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? 'Plan wird erstellt...' : 'Plan erstellen 🚀'}
          </button>
        )}
      </div>
    </div>
  );
}
