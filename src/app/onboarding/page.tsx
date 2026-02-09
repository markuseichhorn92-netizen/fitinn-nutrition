'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { UserProfile } from '@/types';
import { saveProfile } from '@/lib/storage';
import { saveOnboardingProgress, loadOnboardingProgress, clearOnboardingProgress } from '@/lib/database';
import { calculateTDEE, calculateTargetCalories, calculateMacros, calculateWaterGoal } from '@/lib/calculations';

// Simplified to 6 easy steps
const steps = [
  { id: 0, name: 'Über dich', icon: '👤' },
  { id: 1, name: 'Dein Ziel', icon: '🎯' },
  { id: 2, name: 'Dein Alltag', icon: '🏃' },
  { id: 3, name: 'Was du isst', icon: '🥗' },
  { id: 4, name: 'Deine Mahlzeiten', icon: '🍽️' },
  { id: 5, name: 'Fertig!', icon: '🎉' },
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
    afternoonSnack: false,
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
  const [showHelp, setShowHelp] = useState<string | null>(null);

  // Load saved progress
  useEffect(() => {
    const savedProgress = loadOnboardingProgress();
    if (savedProgress) {
      setProfile(prev => ({ ...prev, ...savedProgress.data }));
      // Map old step numbers to new simplified steps
      const oldStep = savedProgress.step;
      if (oldStep <= 0) setStep(0);
      else if (oldStep <= 1) setStep(1);
      else if (oldStep <= 2) setStep(2);
      else if (oldStep <= 5) setStep(3);
      else if (oldStep <= 7) setStep(4);
      else setStep(5);
    }
  }, []);

  // Save progress
  useEffect(() => {
    if (step < 5) {
      saveOnboardingProgress(step, profile);
    }
  }, [step, profile]);

  const updateProfile = useCallback((updates: Partial<UserProfile>) => {
    setProfile(prev => ({ ...prev, ...updates }));
  }, []);

  const nextStep = useCallback(() => {
    if (step < steps.length - 1) {
      setStep(step + 1);
      window.scrollTo(0, 0);
    }
  }, [step]);

  const prevStep = useCallback(() => {
    if (step > 0) {
      setStep(step - 1);
      window.scrollTo(0, 0);
    }
  }, [step]);

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
    clearOnboardingProgress();
    
    await new Promise(resolve => setTimeout(resolve, 800));
    router.push('/plan');
  };

  const progress = ((step + 1) / steps.length) * 100;

  // Calculate preview values for summary
  const tdee = calculateTDEE(profile as UserProfile);
  const targetCalories = calculateTargetCalories(tdee, profile.goal || 'maintain');
  const macros = calculateMacros(targetCalories, profile.goal || 'maintain', profile.weight || 75);

  // Big number selector component
  const BigNumberPicker = ({ 
    value, 
    onChange, 
    min, 
    max, 
    step: stepSize = 1, 
    unit,
    helpText
  }: {
    value: number;
    onChange: (v: number) => void;
    min: number;
    max: number;
    step?: number;
    unit: string;
    helpText?: string;
  }) => (
    <div className="bg-gray-50 rounded-3xl p-6">
      {helpText && (
        <p className="text-sm text-gray-500 text-center mb-4">{helpText}</p>
      )}
      <div className="flex items-center justify-center gap-6">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - stepSize))}
          className="w-16 h-16 rounded-full bg-white shadow-md flex items-center justify-center text-3xl font-bold text-gray-600 active:scale-95 transition-transform touch-manipulation"
        >
          −
        </button>
        <div className="text-center min-w-[120px]">
          <span className="text-5xl font-bold text-gray-900">{value}</span>
          <span className="text-xl text-gray-500 ml-2">{unit}</span>
        </div>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + stepSize))}
          className="w-16 h-16 rounded-full bg-white shadow-md flex items-center justify-center text-3xl font-bold text-gray-600 active:scale-95 transition-transform touch-manipulation"
        >
          +
        </button>
      </div>
    </div>
  );

  // Big option button component
  const OptionButton = ({ 
    selected, 
    onClick, 
    emoji, 
    title, 
    subtitle 
  }: {
    selected: boolean;
    onClick: () => void;
    emoji: string;
    title: string;
    subtitle?: string;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={`w-full p-5 rounded-2xl text-left transition-all active:scale-[0.98] touch-manipulation ${
        selected
          ? 'bg-teal-50 border-2 border-teal-500 shadow-md'
          : 'bg-white border-2 border-gray-200 hover:border-gray-300'
      }`}
    >
      <div className="flex items-center gap-4">
        <span className="text-4xl">{emoji}</span>
        <div>
          <p className={`font-semibold text-lg ${selected ? 'text-teal-700' : 'text-gray-900'}`}>
            {title}
          </p>
          {subtitle && (
            <p className="text-sm text-gray-500">{subtitle}</p>
          )}
        </div>
        {selected && (
          <div className="ml-auto">
            <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        )}
      </div>
    </button>
  );

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Header - Simple Progress */}
      <div className="sticky top-0 bg-white z-10 px-6 py-4 border-b border-gray-100 safe-area-top">
        <div className="flex items-center justify-between mb-3">
          {step > 0 && (
            <button
              onClick={prevStep}
              className="p-2 -ml-2 text-gray-500 touch-manipulation"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <div className="flex-1 text-center">
            <span className="text-2xl">{steps[step].icon}</span>
          </div>
          <div className="w-10" /> {/* Spacer */}
        </div>
        
        {/* Progress Dots */}
        <div className="flex items-center justify-center gap-2">
          {steps.map((s, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all ${
                i === step ? 'w-8 bg-teal-500' : i < step ? 'w-2 bg-teal-300' : 'w-2 bg-gray-200'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 py-8 pb-32 overflow-y-auto">
        
        {/* Step 1: About You */}
        {step === 0 && (
          <div className="space-y-8 animate-fade-in-up">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Erzähl uns von dir</h1>
              <p className="text-gray-500">Das hilft uns, deinen Plan zu berechnen</p>
            </div>
            
            {/* Gender - Big Buttons */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-3 px-1">Ich bin...</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'male', label: 'Mann', emoji: '👨' },
                  { value: 'female', label: 'Frau', emoji: '👩' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => updateProfile({ gender: opt.value as UserProfile['gender'] })}
                    className={`p-6 rounded-2xl text-center transition-all active:scale-[0.98] touch-manipulation ${
                      profile.gender === opt.value
                        ? 'bg-teal-50 border-2 border-teal-500'
                        : 'bg-gray-50 border-2 border-transparent'
                    }`}
                  >
                    <span className="text-5xl block mb-2">{opt.emoji}</span>
                    <span className="font-semibold text-gray-900">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Age */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-3 px-1">Mein Alter</p>
              <BigNumberPicker
                value={profile.age || 30}
                onChange={(v) => updateProfile({ age: v })}
                min={14}
                max={100}
                unit="Jahre"
              />
            </div>

            {/* Height */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-3 px-1">Meine Größe</p>
              <BigNumberPicker
                value={profile.height || 175}
                onChange={(v) => updateProfile({ height: v })}
                min={120}
                max={230}
                unit="cm"
              />
            </div>

            {/* Weight */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-3 px-1">Mein Gewicht</p>
              <BigNumberPicker
                value={profile.weight || 80}
                onChange={(v) => updateProfile({ weight: v })}
                min={40}
                max={200}
                unit="kg"
              />
            </div>
          </div>
        )}

        {/* Step 2: Goal */}
        {step === 1 && (
          <div className="space-y-6 animate-fade-in-up">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Was möchtest du erreichen?</h1>
              <p className="text-gray-500">Wähle dein Hauptziel</p>
            </div>
            
            <div className="space-y-3">
              <OptionButton
                selected={profile.goal === 'lose'}
                onClick={() => updateProfile({ goal: 'lose' })}
                emoji="🔥"
                title="Abnehmen"
                subtitle="Gewicht verlieren, fitter werden"
              />
              <OptionButton
                selected={profile.goal === 'gain'}
                onClick={() => updateProfile({ goal: 'gain' })}
                emoji="💪"
                title="Muskeln aufbauen"
                subtitle="Stärker werden, Masse zulegen"
              />
              <OptionButton
                selected={profile.goal === 'maintain'}
                onClick={() => updateProfile({ goal: 'maintain' })}
                emoji="⚖️"
                title="Gewicht halten"
                subtitle="Gesund essen, fit bleiben"
              />
            </div>

            {/* Target Weight (only for lose/gain) */}
            {(profile.goal === 'lose' || profile.goal === 'gain') && (
              <div className="pt-4">
                <p className="text-sm font-medium text-gray-700 mb-3 px-1">Mein Zielgewicht</p>
                <BigNumberPicker
                  value={profile.targetWeight || profile.weight || 75}
                  onChange={(v) => updateProfile({ targetWeight: v })}
                  min={40}
                  max={200}
                  unit="kg"
                  helpText={profile.goal === 'lose' 
                    ? `Aktuell: ${profile.weight} kg`
                    : `Aktuell: ${profile.weight} kg`
                  }
                />
              </div>
            )}
          </div>
        )}

        {/* Step 3: Activity */}
        {step === 2 && (
          <div className="space-y-6 animate-fade-in-up">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Wie aktiv bist du?</h1>
              <p className="text-gray-500">Das bestimmt deinen Kalorienbedarf</p>
            </div>
            
            {/* Job Type */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-3 px-1">Meine Arbeit ist...</p>
              <div className="space-y-3">
                <OptionButton
                  selected={profile.occupation === 'sedentary'}
                  onClick={() => updateProfile({ occupation: 'sedentary' })}
                  emoji="💻"
                  title="Hauptsächlich sitzend"
                  subtitle="Büro, Computer, Schreibtisch"
                />
                <OptionButton
                  selected={profile.occupation === 'standing'}
                  onClick={() => updateProfile({ occupation: 'standing' })}
                  emoji="🧍"
                  title="Oft stehend"
                  subtitle="Verkauf, Empfang, Beratung"
                />
                <OptionButton
                  selected={profile.occupation === 'active' || profile.occupation === 'heavy'}
                  onClick={() => updateProfile({ occupation: 'active' })}
                  emoji="🚶"
                  title="Körperlich aktiv"
                  subtitle="Handwerk, Pflege, Lager"
                />
              </div>
            </div>

            {/* Sport Frequency - Simple */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-3 px-1">Ich trainiere...</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 0, label: 'Gar nicht', emoji: '🛋️' },
                  { value: 2, label: '1-2x pro Woche', emoji: '🏃' },
                  { value: 4, label: '3-4x pro Woche', emoji: '💪' },
                  { value: 6, label: '5x+ pro Woche', emoji: '🔥' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => updateProfile({ sportsFrequency: opt.value })}
                    className={`p-5 rounded-2xl text-center transition-all active:scale-[0.98] touch-manipulation ${
                      Math.abs((profile.sportsFrequency || 0) - opt.value) <= 1
                        ? 'bg-teal-50 border-2 border-teal-500'
                        : 'bg-gray-50 border-2 border-transparent'
                    }`}
                  >
                    <span className="text-3xl block mb-2">{opt.emoji}</span>
                    <span className="text-sm font-medium text-gray-700">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Diet Preferences */}
        {step === 3 && (
          <div className="space-y-6 animate-fade-in-up">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Was isst du?</h1>
              <p className="text-gray-500">Wir passen die Rezepte an</p>
            </div>
            
            <div className="space-y-3">
              <OptionButton
                selected={profile.dietType === 'mixed'}
                onClick={() => updateProfile({ dietType: 'mixed' })}
                emoji="🍖"
                title="Alles"
                subtitle="Fleisch, Fisch, Gemüse – alles dabei"
              />
              <OptionButton
                selected={profile.dietType === 'vegetarian'}
                onClick={() => updateProfile({ dietType: 'vegetarian' })}
                emoji="🥬"
                title="Vegetarisch"
                subtitle="Kein Fleisch und Fisch"
              />
              <OptionButton
                selected={profile.dietType === 'vegan'}
                onClick={() => updateProfile({ dietType: 'vegan' })}
                emoji="🌱"
                title="Vegan"
                subtitle="Nur pflanzliche Lebensmittel"
              />
              <OptionButton
                selected={profile.dietType === 'lowcarb' || profile.dietType === 'keto'}
                onClick={() => updateProfile({ dietType: 'lowcarb' })}
                emoji="🥑"
                title="Low Carb"
                subtitle="Weniger Kohlenhydrate"
              />
            </div>

            {/* Cooking Time */}
            <div className="pt-4">
              <p className="text-sm font-medium text-gray-700 mb-3 px-1">Wie viel Zeit hast du zum Kochen?</p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'minimal', label: 'Wenig', time: '~10 min', emoji: '⚡' },
                  { value: 'normal', label: 'Normal', time: '~20 min', emoji: '👍' },
                  { value: 'elaborate', label: 'Viel', time: '~45 min', emoji: '👨‍🍳' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => updateProfile({ cookingEffort: opt.value as UserProfile['cookingEffort'] })}
                    className={`p-4 rounded-2xl text-center transition-all active:scale-[0.98] touch-manipulation ${
                      profile.cookingEffort === opt.value
                        ? 'bg-teal-50 border-2 border-teal-500'
                        : 'bg-gray-50 border-2 border-transparent'
                    }`}
                  >
                    <span className="text-3xl block mb-1">{opt.emoji}</span>
                    <span className="text-sm font-medium text-gray-700 block">{opt.label}</span>
                    <span className="text-xs text-gray-500">{opt.time}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Meals */}
        {step === 4 && (
          <div className="space-y-6 animate-fade-in-up">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Wann isst du?</h1>
              <p className="text-gray-500">Tippe auf die Mahlzeiten, die du planst</p>
            </div>
            
            <div className="space-y-3">
              {[
                { key: 'breakfast', label: 'Frühstück', time: 'morgens', emoji: '🌅' },
                { key: 'lunch', label: 'Mittagessen', time: 'mittags', emoji: '☀️' },
                { key: 'dinner', label: 'Abendessen', time: 'abends', emoji: '🌙' },
                { key: 'morningSnack', label: 'Snack vormittags', time: 'optional', emoji: '🍎' },
                { key: 'afternoonSnack', label: 'Snack nachmittags', time: 'optional', emoji: '🍌' },
              ].map(meal => (
                <button
                  key={meal.key}
                  type="button"
                  onClick={() => {
                    updateProfile({
                      meals: {
                        ...profile.meals!,
                        [meal.key]: !profile.meals![meal.key as keyof typeof profile.meals],
                      },
                    });
                  }}
                  className={`w-full p-5 rounded-2xl flex items-center gap-4 transition-all active:scale-[0.98] touch-manipulation ${
                    profile.meals![meal.key as keyof typeof profile.meals]
                      ? 'bg-teal-50 border-2 border-teal-500'
                      : 'bg-gray-50 border-2 border-transparent'
                  }`}
                >
                  <span className="text-4xl">{meal.emoji}</span>
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-gray-900">{meal.label}</p>
                    <p className="text-sm text-gray-500">{meal.time}</p>
                  </div>
                  <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                    profile.meals![meal.key as keyof typeof profile.meals]
                      ? 'bg-teal-500 border-teal-500'
                      : 'border-gray-300'
                  }`}>
                    {profile.meals![meal.key as keyof typeof profile.meals] && (
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* Quick tip */}
            <div className="bg-amber-50 rounded-2xl p-4 flex items-start gap-3">
              <span className="text-2xl">💡</span>
              <p className="text-sm text-amber-800">
                <strong>Tipp:</strong> Wähle mindestens Frühstück, Mittag und Abendessen für einen ausgewogenen Plan.
              </p>
            </div>
          </div>
        )}

        {/* Step 6: Summary */}
        {step === 5 && (
          <div className="space-y-6 animate-fade-in-up">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Perfekt! 🎉</h1>
              <p className="text-gray-500">Dein persönlicher Plan ist fertig</p>
            </div>
            
            {/* Big Calorie Card */}
            <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-3xl p-8 text-center text-white shadow-xl">
              <p className="text-teal-100 mb-2">Dein tägliches Ziel</p>
              <p className="text-6xl font-bold mb-2">{targetCalories}</p>
              <p className="text-teal-100 text-xl">Kalorien pro Tag</p>
              
              {/* Macros - Simple */}
              <div className="grid grid-cols-3 gap-4 mt-8 pt-6 border-t border-teal-400/30">
                <div>
                  <p className="text-3xl font-bold">{macros.protein}g</p>
                  <p className="text-sm text-teal-100">Eiweiß</p>
                </div>
                <div>
                  <p className="text-3xl font-bold">{macros.carbs}g</p>
                  <p className="text-sm text-teal-100">Kohlenhydrate</p>
                </div>
                <div>
                  <p className="text-3xl font-bold">{macros.fat}g</p>
                  <p className="text-sm text-teal-100">Fett</p>
                </div>
              </div>
            </div>

            {/* What to expect */}
            <div className="bg-gray-50 rounded-2xl p-5 space-y-4">
              <p className="font-semibold text-gray-900">Das erwartet dich:</p>
              <div className="space-y-3">
                {[
                  { emoji: '📅', text: 'Tagesplan mit leckeren Rezepten' },
                  { emoji: '🔄', text: 'Rezepte tauschen mit einem Klick' },
                  { emoji: '🛒', text: 'Automatische Einkaufsliste' },
                  { emoji: '💧', text: 'Wasser-Tracker' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-2xl">{item.emoji}</span>
                    <span className="text-gray-700">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* FIT-INN Branding */}
            <div className="text-center pt-4">
              <div className="flex items-center justify-center gap-2">
                <Image src="/logo.png" alt="FIT-INN" width={28} height={28} className="rounded" />
                <span className="font-bold text-gray-700">FIT-INN Trier</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Button - Always Visible */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 py-4 safe-area-bottom">
        {step < steps.length - 1 ? (
          <button
            type="button"
            onClick={nextStep}
            className="w-full py-5 rounded-2xl bg-gradient-to-r from-teal-500 to-teal-600 text-white font-bold text-xl shadow-lg shadow-teal-500/30 active:scale-[0.98] transition-transform touch-manipulation"
          >
            Weiter →
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full py-5 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold text-xl shadow-lg shadow-orange-500/30 disabled:opacity-50 active:scale-[0.98] transition-transform touch-manipulation"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-3">
                <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Plan wird erstellt...
              </span>
            ) : (
              'Plan starten! 🚀'
            )}
          </button>
        )}
      </div>
    </div>
  );
}
