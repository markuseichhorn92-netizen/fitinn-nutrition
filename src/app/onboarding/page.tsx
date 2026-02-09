'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { UserProfile } from '@/types';
import { saveProfile } from '@/lib/storage';
import { saveOnboardingProgress, loadOnboardingProgress, clearOnboardingProgress } from '@/lib/database';
import { calculateTDEE, calculateTargetCalories, calculateMacros, calculateWaterGoal, getGoalLabel, getDietLabel } from '@/lib/calculations';
import { getSupabaseClient } from '@/lib/supabase';

const steps = [
  { id: 0, name: 'Persönliche Daten', required: true },
  { id: 1, name: 'Dein Ziel', required: true },
  { id: 2, name: 'Aktivitätslevel', required: true },
  { id: 3, name: 'Ernährungsform', required: true },
  { id: 4, name: 'Allergien', required: false },
  { id: 5, name: 'Lebensmittel', required: false },
  { id: 6, name: 'Alltagstauglichkeit', required: true },
  { id: 7, name: 'Mahlzeiten', required: true },
  { id: 8, name: 'Haushalt', required: true },
  { id: 9, name: 'Zusammenfassung', required: true },
  { id: 10, name: 'Registrierung', required: true },
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

// Validation functions
const validateStep = (step: number, profile: Partial<UserProfile>): string | null => {
  switch (step) {
    case 0: // Personal Data
      if (!profile.gender) return 'Bitte wähle dein Geschlecht';
      if (!profile.age || profile.age < 14 || profile.age > 100) return 'Bitte gib ein gültiges Alter an (14-100)';
      if (!profile.height || profile.height < 120 || profile.height > 230) return 'Bitte gib eine gültige Größe an (120-230 cm)';
      if (!profile.weight || profile.weight < 40 || profile.weight > 250) return 'Bitte gib ein gültiges Gewicht an (40-250 kg)';
      return null;
    case 1: // Goal
      if (!profile.goal) return 'Bitte wähle ein Ziel';
      return null;
    case 2: // Activity
      if (!profile.occupation) return 'Bitte wähle deine berufliche Tätigkeit';
      if (profile.sportsFrequency === undefined) return 'Bitte gib deine Trainingshäufigkeit an';
      if (!profile.dailyActivity) return 'Bitte wähle dein Aktivitätslevel';
      return null;
    case 3: // Diet Type
      if (!profile.dietType) return 'Bitte wähle eine Ernährungsform';
      return null;
    case 6: // Practicality
      if (!profile.cookingEffort) return 'Bitte wähle deinen Kochaufwand';
      if (!profile.workType) return 'Bitte wähle deinen Arbeitsplatz';
      return null;
    case 7: // Meals
      const activeMeals = Object.values(profile.meals || {}).filter(v => v === true).length;
      if (activeMeals < 2) return 'Bitte wähle mindestens 2 Mahlzeiten';
      return null;
    case 8: // Household
      if (!profile.householdSize || profile.householdSize < 1) return 'Bitte gib die Haushaltsgröße an';
      if (!profile.budget) return 'Bitte wähle dein Budget';
      return null;
    default:
      return null;
  }
};

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<Partial<UserProfile>>(initialProfile);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('left');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showTDEEAnimation, setShowTDEEAnimation] = useState(false);
  
  // Registration state
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPasswordConfirm, setRegPasswordConfirm] = useState('');
  const [regError, setRegError] = useState<string | null>(null);
  const [regLoading, setRegLoading] = useState(false);

  // Load saved progress on mount
  useEffect(() => {
    const savedProgress = loadOnboardingProgress();
    if (savedProgress) {
      setProfile(prev => ({ ...prev, ...savedProgress.data }));
      setStep(savedProgress.step);
    }
  }, []);

  // Save progress on step/profile change
  useEffect(() => {
    if (step < 9) { // Don't save on summary step
      saveOnboardingProgress(step, profile);
    }
  }, [step, profile]);

  // Trigger TDEE animation on summary step
  useEffect(() => {
    if (step === 9) {
      const timer = setTimeout(() => setShowTDEEAnimation(true), 300);
      return () => clearTimeout(timer);
    } else {
      setShowTDEEAnimation(false);
    }
  }, [step]);

  const updateProfile = useCallback((updates: Partial<UserProfile>) => {
    setProfile(prev => ({ ...prev, ...updates }));
    setValidationError(null);
  }, []);

  const nextStep = useCallback(() => {
    // Validate current step
    const error = validateStep(step, profile);
    if (error && steps[step].required) {
      setValidationError(error);
      return;
    }
    
    setValidationError(null);
    if (step < steps.length - 1) {
      setSlideDirection('left');
      setStep(step + 1);
    }
  }, [step, profile]);

  const prevStep = useCallback(() => {
    setValidationError(null);
    if (step > 0) {
      setSlideDirection('right');
      setStep(step - 1);
    }
  }, [step]);

  const skipStep = useCallback(() => {
    if (!steps[step].required) {
      setSlideDirection('left');
      setStep(step + 1);
      setValidationError(null);
    }
  }, [step]);

  const saveProfileAndFinish = async () => {
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
    router.push('/plan');
  };

  const handleGoogleRegister = async () => {
    setRegLoading(true);
    setRegError(null);
    
    // Save profile first
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
    
    const supabase = getSupabaseClient();
    if (!supabase) {
      // If Supabase not configured, just continue without auth
      router.push('/plan');
      return;
    }

    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);
    
    if (regPassword !== regPasswordConfirm) {
      setRegError('Passwörter stimmen nicht überein');
      return;
    }
    
    if (regPassword.length < 6) {
      setRegError('Passwort muss mindestens 6 Zeichen haben');
      return;
    }
    
    setRegLoading(true);
    
    const supabase = getSupabaseClient();
    if (!supabase) {
      // If Supabase not configured, just continue without auth
      await saveProfileAndFinish();
      return;
    }

    const { error } = await supabase.auth.signUp({
      email: regEmail,
      password: regPassword,
    });

    if (error) {
      setRegError(error.message);
      setRegLoading(false);
    } else {
      await saveProfileAndFinish();
    }
  };

  const handleSkipRegistration = async () => {
    setIsSubmitting(true);
    await saveProfileAndFinish();
  };

  const handleSubmit = async () => {
    // Legacy function - now we go to registration step instead
    setSlideDirection('left');
    setStep(10);
  };

  const progress = ((step + 1) / steps.length) * 100;

  const tdee = calculateTDEE(profile as UserProfile);
  const targetCalories = calculateTargetCalories(tdee, profile.goal || 'maintain');
  const macros = calculateMacros(targetCalories, profile.goal || 'maintain', profile.weight || 75);
  const waterGoal = calculateWaterGoal(profile.weight || 75, profile.sportsFrequency || 3);

  // Number input with +/- buttons
  const NumberInput = ({ value, onChange, min, max, step: inputStep = 1, unit }: {
    value: number;
    onChange: (v: number) => void;
    min: number;
    max: number;
    step?: number;
    unit?: string;
  }) => (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - inputStep))}
        className="w-14 h-14 touch-manipulation rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-xl font-bold text-gray-600 transition-colors"
      >
        −
      </button>
      <div className="flex-1 text-center">
        <span className="text-3xl font-bold text-gray-900">{value}</span>
        {unit && <span className="text-lg text-gray-500 ml-1">{unit}</span>}
      </div>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + inputStep))}
        className="w-14 h-14 touch-manipulation rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-xl font-bold text-gray-600 transition-colors"
      >
        +
      </button>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Progress Header */}
      <div className="sticky top-0 bg-white z-10 px-6 py-4 border-b border-gray-100 shadow-sm">
        {/* Logo */}
        <div className="flex items-center justify-center mb-3">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="FIT-INN" width={32} height={32} className="rounded-lg" />
            <span className="font-bold text-gray-900">FIT-INN Nutrition</span>
          </div>
        </div>
        
        {/* Progress Bar with Step Labels */}
        <div className="relative mb-2">
          <div className="flex justify-between mb-1">
            {steps.map((s, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-all ${
                  i <= step ? 'bg-teal-500' : 'bg-gray-200'
                } ${i === step ? 'scale-150' : ''}`}
              />
            ))}
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-teal-400 to-teal-600 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">Schritt {step + 1} von {steps.length}</span>
          <span className="text-sm font-medium text-teal-600">{steps[step].name}</span>
        </div>
      </div>

      {/* Content with Slide Animation */}
      <div className="flex-1 px-6 py-6 pb-32 overflow-hidden">
        <div 
          className={`transition-all duration-300 ease-out transform ${
            slideDirection === 'left' ? 'animate-slide-in-left' : 'animate-slide-in-right'
          }`}
          key={step}
        >
          {/* Validation Error */}
          {validationError && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
              <span className="text-red-500 text-xl">⚠️</span>
              <span className="text-red-700 text-sm">{validationError}</span>
            </div>
          )}

          {/* Step 1: Personal Data */}
          {step === 0 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold mb-2 text-gray-900">Erzähl uns von dir</h2>
              <p className="text-gray-500 mb-6">Diese Daten helfen uns, deinen Kalorienbedarf zu berechnen.</p>
              
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
                      type="button"
                      onClick={() => updateProfile({ gender: opt.value as UserProfile['gender'] })}
                      className={`p-5 rounded-2xl text-center transition-all transform hover:scale-105 active:scale-95 touch-manipulation ${
                        profile.gender === opt.value
                          ? 'bg-teal-50 border-2 border-teal-500 shadow-md'
                          : 'bg-gray-50 border-2 border-transparent hover:border-gray-200'
                      }`}
                    >
                      <span className="text-4xl mb-2 block">{opt.emoji}</span>
                      <span className="text-sm font-medium text-gray-700">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Alter</label>
                <NumberInput
                  value={profile.age || 30}
                  onChange={(v) => updateProfile({ age: v })}
                  min={14}
                  max={100}
                  unit="Jahre"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Größe</label>
                <NumberInput
                  value={profile.height || 175}
                  onChange={(v) => updateProfile({ height: v })}
                  min={120}
                  max={230}
                  unit="cm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Aktuelles Gewicht</label>
                  <NumberInput
                    value={profile.weight || 80}
                    onChange={(v) => updateProfile({ weight: v })}
                    min={40}
                    max={250}
                    unit="kg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Zielgewicht</label>
                  <NumberInput
                    value={profile.targetWeight || 75}
                    onChange={(v) => updateProfile({ targetWeight: v })}
                    min={40}
                    max={200}
                    unit="kg"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Goal */}
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold mb-2 text-gray-900">Was ist dein Ziel?</h2>
              <p className="text-gray-500 mb-6">Dein Ziel bestimmt deinen Kalorienplan.</p>
              
              <div className="space-y-3">
                {[
                  { value: 'lose', label: 'Abnehmen', emoji: '🔥', desc: 'Fett verbrennen, Gewicht reduzieren', color: 'from-orange-400 to-red-500' },
                  { value: 'gain', label: 'Muskelaufbau', emoji: '💪', desc: 'Muskelmasse aufbauen', color: 'from-blue-400 to-indigo-500' },
                  { value: 'maintain', label: 'Gewicht halten', emoji: '⚖️', desc: 'Gesund essen, Gewicht stabilisieren', color: 'from-green-400 to-teal-500' },
                  { value: 'define', label: 'Definition', emoji: '🏋️', desc: 'Muskeln definieren, Fett reduzieren', color: 'from-purple-400 to-pink-500' },
                  { value: 'performance', label: 'Leistung steigern', emoji: '🏃', desc: 'Energie für sportliche Ziele', color: 'from-yellow-400 to-orange-500' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => updateProfile({ goal: opt.value as UserProfile['goal'] })}
                    className={`w-full p-5 rounded-2xl flex items-center gap-4 text-left transition-all transform hover:scale-[1.02] ${
                      profile.goal === opt.value
                        ? 'bg-gradient-to-r ' + opt.color + ' text-white shadow-lg'
                        : 'bg-gray-50 border-2 border-transparent hover:border-gray-200'
                    }`}
                  >
                    <span className={`text-4xl ${profile.goal === opt.value ? 'animate-bounce' : ''}`}>{opt.emoji}</span>
                    <div>
                      <p className={`font-bold text-lg ${profile.goal === opt.value ? 'text-white' : 'text-gray-900'}`}>{opt.label}</p>
                      <p className={`text-sm ${profile.goal === opt.value ? 'text-white/80' : 'text-gray-500'}`}>{opt.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Activity Level */}
          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold mb-2 text-gray-900">Wie aktiv bist du?</h2>
              <p className="text-gray-500 mb-6">Dein Aktivitätslevel beeinflusst deinen Kalorienbedarf.</p>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Berufliche Tätigkeit</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'sedentary', label: 'Sitzend', emoji: '💻', desc: 'Büro, Schreibtisch' },
                    { value: 'standing', label: 'Stehend', emoji: '🧍', desc: 'Verkauf, Beratung' },
                    { value: 'active', label: 'Aktiv', emoji: '🚶', desc: 'Handwerk, Pflege' },
                    { value: 'heavy', label: 'Körperlich', emoji: '🏗️', desc: 'Bau, Landwirtschaft' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => updateProfile({ occupation: opt.value as UserProfile['occupation'] })}
                      className={`p-4 rounded-2xl text-center transition-all transform hover:scale-105 active:scale-95 touch-manipulation ${
                        profile.occupation === opt.value
                          ? 'bg-teal-50 border-2 border-teal-500 shadow-md'
                          : 'bg-gray-50 border-2 border-transparent hover:border-gray-200'
                      }`}
                    >
                      <span className="text-3xl mb-2 block">{opt.emoji}</span>
                      <span className="text-sm font-medium text-gray-700 block">{opt.label}</span>
                      <span className="text-xs text-gray-500">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Wie oft trainierst du pro Woche?
                </label>
                <div className="bg-gray-50 rounded-2xl p-4">
                  <input
                    type="range"
                    min={0}
                    max={7}
                    value={profile.sportsFrequency}
                    onChange={(e) => updateProfile({ sportsFrequency: parseInt(e.target.value) })}
                    className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-teal-500"
                  />
                  <div className="flex justify-between mt-2 text-xs text-gray-500">
                    <span>0x</span>
                    <span className="text-2xl font-bold text-teal-600">{profile.sportsFrequency}x / Woche</span>
                    <span>7x</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Alltagsaktivität</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: 'low', label: 'Wenig', emoji: '🛋️', desc: '<5k Schritte' },
                    { value: 'moderate', label: 'Moderat', emoji: '🚶', desc: '5-10k Schritte' },
                    { value: 'high', label: 'Viel', emoji: '🏃', desc: '>10k Schritte' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => updateProfile({ dailyActivity: opt.value as UserProfile['dailyActivity'] })}
                      className={`p-4 rounded-2xl text-center transition-all transform hover:scale-105 active:scale-95 touch-manipulation ${
                        profile.dailyActivity === opt.value
                          ? 'bg-teal-50 border-2 border-teal-500 shadow-md'
                          : 'bg-gray-50 border-2 border-transparent hover:border-gray-200'
                      }`}
                    >
                      <span className="text-3xl mb-2 block">{opt.emoji}</span>
                      <span className="text-sm font-medium text-gray-700 block">{opt.label}</span>
                      <span className="text-xs text-gray-500">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Diet Type */}
          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold mb-2 text-gray-900">Deine Ernährungsform</h2>
              <p className="text-gray-500 mb-6">Wir passen die Rezepte an deine Präferenzen an.</p>
              
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'mixed', label: 'Mischkost', emoji: '🥩🥬', desc: 'Alles erlaubt' },
                  { value: 'vegetarian', label: 'Vegetarisch', emoji: '🥬', desc: 'Kein Fleisch/Fisch' },
                  { value: 'vegan', label: 'Vegan', emoji: '🌱', desc: 'Rein pflanzlich' },
                  { value: 'pescatarian', label: 'Pescetarisch', emoji: '🐟', desc: 'Fisch, kein Fleisch' },
                  { value: 'lowcarb', label: 'Low Carb', emoji: '🥑', desc: 'Wenig Kohlenhydrate' },
                  { value: 'highprotein', label: 'High Protein', emoji: '💪', desc: 'Proteinreich' },
                  { value: 'keto', label: 'Ketogen', emoji: '🥓', desc: 'Sehr wenig Carbs' },
                  { value: 'paleo', label: 'Paleo', emoji: '🦴', desc: 'Steinzeit-Ernährung' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => updateProfile({ dietType: opt.value as UserProfile['dietType'] })}
                    className={`p-4 rounded-2xl text-center transition-all transform hover:scale-105 active:scale-95 touch-manipulation ${
                      profile.dietType === opt.value
                        ? 'bg-teal-50 border-2 border-teal-500 shadow-md'
                        : 'bg-gray-50 border-2 border-transparent hover:border-gray-200'
                    }`}
                  >
                    <span className="text-3xl mb-2 block">{opt.emoji}</span>
                    <span className="text-sm font-medium text-gray-700 block">{opt.label}</span>
                    <span className="text-xs text-gray-500">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 5: Allergies */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold mb-2 text-gray-900">Allergien & Unverträglichkeiten</h2>
                  <p className="text-gray-500">Wähle alles aus, was auf dich zutrifft</p>
                </div>
                <span className="px-3 py-1 bg-gray-100 text-gray-500 text-xs font-medium rounded-full">Optional</span>
              </div>
              
              <div className="space-y-3">
                {allergiesOptions.map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      const allergies = profile.allergies || [];
                      const updated = allergies.includes(opt.id)
                        ? allergies.filter(a => a !== opt.id)
                        : [...allergies, opt.id];
                      updateProfile({ allergies: updated });
                    }}
                    className={`w-full p-4 rounded-2xl flex items-center gap-4 text-left transition-all transform hover:scale-[1.01] ${
                      profile.allergies?.includes(opt.id)
                        ? 'bg-red-50 border-2 border-red-400 shadow-md'
                        : 'bg-gray-50 border-2 border-transparent hover:border-gray-200'
                    }`}
                  >
                    <span className="text-3xl">{opt.emoji}</span>
                    <span className="flex-1 text-gray-700 font-medium">{opt.label}</span>
                    <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all ${
                      profile.allergies?.includes(opt.id)
                        ? 'bg-red-500 border-red-500'
                        : 'border-gray-300'
                    }`}>
                      {profile.allergies?.includes(opt.id) && (
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

          {/* Step 6: Food Preferences */}
          {step === 5 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold mb-2 text-gray-900">Lebensmittel-Präferenzen</h2>
                  <p className="text-gray-500">Was magst du nicht?</p>
                </div>
                <span className="px-3 py-1 bg-gray-100 text-gray-500 text-xs font-medium rounded-full">Optional</span>
              </div>
              
              <div className="flex flex-wrap gap-3">
                {commonFoods.map(food => (
                  <button
                    key={food.id}
                    type="button"
                    onClick={() => {
                      const excluded = profile.excludedFoods || [];
                      const updated = excluded.includes(food.id)
                        ? excluded.filter(f => f !== food.id)
                        : [...excluded, food.id];
                      updateProfile({ excludedFoods: updated });
                    }}
                    className={`px-5 py-3 rounded-full text-sm font-medium transition-all transform hover:scale-105 active:scale-95 touch-manipulation ${
                      profile.excludedFoods?.includes(food.id)
                        ? 'bg-red-100 text-red-600 border-2 border-red-300 shadow-md'
                        : 'bg-gray-100 text-gray-600 border-2 border-gray-200 hover:border-gray-300'
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
              <h2 className="text-2xl font-bold mb-2 text-gray-900">Alltagstauglichkeit</h2>
              <p className="text-gray-500 mb-6">Wie viel Zeit hast du zum Kochen?</p>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Kochaufwand</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: 'minimal', label: 'Schnell', emoji: '⚡', desc: '<10 Min' },
                    { value: 'normal', label: 'Normal', emoji: '👍', desc: '<20 Min' },
                    { value: 'elaborate', label: 'Aufwendig', emoji: '👨‍🍳', desc: '<45 Min' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => updateProfile({ cookingEffort: opt.value as UserProfile['cookingEffort'] })}
                      className={`p-4 rounded-2xl text-center transition-all transform hover:scale-105 active:scale-95 touch-manipulation ${
                        profile.cookingEffort === opt.value
                          ? 'bg-teal-50 border-2 border-teal-500 shadow-md'
                          : 'bg-gray-50 border-2 border-transparent hover:border-gray-200'
                      }`}
                    >
                      <span className="text-3xl mb-2 block">{opt.emoji}</span>
                      <span className="text-sm font-medium text-gray-700 block">{opt.label}</span>
                      <span className="text-xs text-gray-500">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Meal Prep?</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => updateProfile({ mealPrep: true })}
                    className={`p-5 rounded-2xl text-center transition-all transform hover:scale-105 active:scale-95 touch-manipulation ${
                      profile.mealPrep
                        ? 'bg-teal-50 border-2 border-teal-500 shadow-md'
                        : 'bg-gray-50 border-2 border-transparent hover:border-gray-200'
                    }`}
                  >
                    <span className="text-3xl mb-2 block">📦</span>
                    <span className="text-sm font-medium text-gray-700">Ja, vorkochen</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => updateProfile({ mealPrep: false })}
                    className={`p-5 rounded-2xl text-center transition-all transform hover:scale-105 active:scale-95 touch-manipulation ${
                      !profile.mealPrep
                        ? 'bg-teal-50 border-2 border-teal-500 shadow-md'
                        : 'bg-gray-50 border-2 border-transparent hover:border-gray-200'
                    }`}
                  >
                    <span className="text-3xl mb-2 block">🍳</span>
                    <span className="text-sm font-medium text-gray-700">Täglich frisch</span>
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
                      type="button"
                      onClick={() => updateProfile({ workType: opt.value as UserProfile['workType'] })}
                      className={`p-4 rounded-2xl text-center transition-all transform hover:scale-105 active:scale-95 touch-manipulation ${
                        profile.workType === opt.value
                          ? 'bg-teal-50 border-2 border-teal-500 shadow-md'
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
                  { key: 'lunch', label: 'Mittagessen', emoji: '🍽️', time: '12:00 - 14:00' },
                  { key: 'afternoonSnack', label: 'Nachmittags-Snack', emoji: '🍏', time: '15:00 - 16:00' },
                  { key: 'dinner', label: 'Abendessen', emoji: '🌙', time: '18:00 - 20:00' },
                  { key: 'lateSnack', label: 'Spät-Snack', emoji: '🌜', time: '21:00 - 22:00' },
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
                    className={`w-full p-4 rounded-2xl flex items-center gap-4 text-left transition-all transform hover:scale-[1.01] ${
                      profile.meals![meal.key as keyof typeof profile.meals]
                        ? 'bg-teal-50 border-2 border-teal-500 shadow-md'
                        : 'bg-gray-50 border-2 border-transparent hover:border-gray-200'
                    }`}
                  >
                    <span className="text-3xl">{meal.emoji}</span>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{meal.label}</p>
                      <p className="text-sm text-gray-500">{meal.time}</p>
                    </div>
                    <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all ${
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
              <h2 className="text-2xl font-bold mb-2 text-gray-900">Dein Haushalt</h2>
              <p className="text-gray-500 mb-6">Für wen kochst du?</p>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Für wie viele Personen kochst du?
                </label>
                <div className="bg-gray-50 rounded-2xl p-6">
                  <div className="flex items-center justify-center gap-6">
                    {[1, 2, 3, 4, 5, 6].map(n => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => updateProfile({ householdSize: n })}
                        className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold transition-all transform hover:scale-110 ${
                          profile.householdSize === n
                            ? 'bg-teal-500 text-white shadow-lg'
                            : 'bg-white text-gray-600 shadow-sm hover:shadow-md'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                  <p className="text-center mt-4 text-teal-600 font-medium">
                    {profile.householdSize === 1 ? '1 Person' : `${profile.householdSize} Personen`}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Budget</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: 'cheap', label: 'Günstig', emoji: '💰', desc: 'Budget-freundlich' },
                    { value: 'normal', label: 'Normal', emoji: '💵', desc: 'Ausgewogen' },
                    { value: 'any', label: 'Egal', emoji: '💎', desc: 'Premium möglich' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => updateProfile({ budget: opt.value as UserProfile['budget'] })}
                      className={`p-4 rounded-2xl text-center transition-all transform hover:scale-105 active:scale-95 touch-manipulation ${
                        profile.budget === opt.value
                          ? 'bg-teal-50 border-2 border-teal-500 shadow-md'
                          : 'bg-gray-50 border-2 border-transparent hover:border-gray-200'
                      }`}
                    >
                      <span className="text-3xl mb-2 block">{opt.emoji}</span>
                      <span className="text-sm font-medium text-gray-700 block">{opt.label}</span>
                      <span className="text-xs text-gray-500">{opt.desc}</span>
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
              <p className="text-gray-500 mb-6">Hier ist deine persönliche Zusammenfassung</p>
              
              {/* TDEE Calorie Card with Animation */}
              <div className={`bg-gradient-to-br from-teal-500 via-teal-600 to-teal-700 rounded-3xl p-8 text-center text-white shadow-2xl transform transition-all duration-700 ${
                showTDEEAnimation ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
              }`}>
                <p className="text-teal-100 text-sm mb-2 uppercase tracking-wider">Dein tägliches Kalorienziel</p>
                <div className="relative">
                  <p className={`text-6xl font-black mb-2 transition-all duration-1000 ${
                    showTDEEAnimation ? 'opacity-100' : 'opacity-0'
                  }`} style={{ 
                    textShadow: '0 4px 8px rgba(0,0,0,0.2)',
                  }}>
                    {showTDEEAnimation ? targetCalories : 0}
                  </p>
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className={`w-32 h-32 rounded-full border-4 border-teal-300/30 transition-all duration-1000 ${
                      showTDEEAnimation ? 'scale-150 opacity-0' : 'scale-100 opacity-100'
                    }`} />
                  </div>
                </div>
                <p className="text-teal-100 text-lg">kcal pro Tag</p>
                
                <div className="grid grid-cols-3 gap-4 mt-8 pt-6 border-t border-teal-400/30">
                  <div className={`transform transition-all duration-500 delay-300 ${
                    showTDEEAnimation ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
                  }`}>
                    <p className="text-3xl font-bold">{macros.protein}g</p>
                    <p className="text-xs text-teal-100 uppercase tracking-wider">Protein</p>
                  </div>
                  <div className={`transform transition-all duration-500 delay-500 ${
                    showTDEEAnimation ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
                  }`}>
                    <p className="text-3xl font-bold">{macros.carbs}g</p>
                    <p className="text-xs text-teal-100 uppercase tracking-wider">Kohlenhydrate</p>
                  </div>
                  <div className={`transform transition-all duration-500 delay-700 ${
                    showTDEEAnimation ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
                  }`}>
                    <p className="text-3xl font-bold">{macros.fat}g</p>
                    <p className="text-xs text-teal-100 uppercase tracking-wider">Fett</p>
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className={`bg-gray-50 rounded-2xl p-5 space-y-3 transform transition-all duration-500 delay-500 ${
                showTDEEAnimation ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
              }`}>
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-gray-500">Ziel</span>
                  <span className="font-medium text-gray-900 flex items-center gap-2">
                    {profile.goal === 'lose' && '🔥'}
                    {profile.goal === 'gain' && '💪'}
                    {profile.goal === 'maintain' && '⚖️'}
                    {profile.goal === 'define' && '🏋️'}
                    {profile.goal === 'performance' && '🏃'}
                    {getGoalLabel(profile.goal || '')}
                  </span>
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
                  <span className="font-medium text-gray-900">💧 {waterGoal} L / Tag</span>
                </div>
              </div>
              
              {/* FIT-INN Branding */}
              <div className={`text-center pt-4 transform transition-all duration-500 delay-700 ${
                showTDEEAnimation ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
              }`}>
                <p className="text-gray-400 text-sm">Powered by</p>
                <div className="flex items-center justify-center gap-2 mt-1">
                  <Image src="/logo.png" alt="FIT-INN" width={24} height={24} className="rounded" />
                  <span className="font-bold text-gray-700">FIT-INN Trier</span>
                </div>
              </div>
            </div>
          )}

          {/* Step 11: Registration */}
          {step === 10 && (
            <div className="space-y-6">
              <div className="text-center">
                <span className="text-5xl mb-4 block">🎉</span>
                <h2 className="text-2xl font-bold mb-2 text-gray-900">Fast geschafft!</h2>
                <p className="text-gray-500">Erstelle jetzt dein Konto um deinen Plan zu speichern</p>
              </div>

              {/* Google Registration */}
              <button
                onClick={handleGoogleRegister}
                disabled={regLoading}
                className="w-full flex items-center justify-center gap-3 px-4 py-4 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 shadow-sm"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span className="font-semibold text-gray-700">
                  {regLoading ? 'Laden...' : 'Mit Google registrieren'}
                </span>
              </button>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-400">oder mit E-Mail</span>
                </div>
              </div>

              {/* Email Registration Form */}
              <form onSubmit={handleEmailRegister} className="space-y-4">
                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-xl border border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none text-gray-900"
                  placeholder="E-Mail Adresse"
                  required
                />
                <input
                  type="password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-xl border border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none text-gray-900"
                  placeholder="Passwort (min. 6 Zeichen)"
                  required
                />
                <input
                  type="password"
                  value={regPasswordConfirm}
                  onChange={(e) => setRegPasswordConfirm(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-xl border border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none text-gray-900"
                  placeholder="Passwort bestätigen"
                  required
                />

                {regError && (
                  <p className="text-red-500 text-sm text-center">{regError}</p>
                )}

                <button
                  type="submit"
                  disabled={regLoading}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 text-white font-semibold hover:from-teal-600 hover:to-teal-700 disabled:opacity-50 transition-all"
                >
                  {regLoading ? 'Registrieren...' : 'Konto erstellen'}
                </button>
              </form>

              {/* Skip Registration */}
              <button
                onClick={handleSkipRegistration}
                disabled={isSubmitting}
                className="w-full py-3 text-gray-400 hover:text-gray-600 text-sm font-medium"
              >
                {isSubmitting ? 'Laden...' : 'Ohne Registrierung fortfahren →'}
              </button>

              <p className="text-xs text-gray-400 text-center">
                Mit der Registrierung stimmst du unseren{' '}
                <a href="/datenschutz" className="underline">Datenschutzbestimmungen</a> zu.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Navigation - Hidden on Registration Step */}
      {step !== 10 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 py-4 flex gap-3 shadow-lg">
          {step > 0 && (
            <button
              type="button"
              onClick={prevStep}
              className="flex-1 py-4 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Zurück
            </button>
          )}
          
          {/* Skip button for optional steps */}
          {!steps[step].required && step < steps.length - 1 && (
            <button
              type="button"
              onClick={skipStep}
              className="px-4 py-4 rounded-xl text-gray-500 font-medium hover:text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Überspringen
            </button>
          )}
          
          {step < steps.length - 2 ? (
            <button
              type="button"
              onClick={nextStep}
              className="flex-1 py-4 rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 text-white font-semibold hover:from-teal-600 hover:to-teal-700 transition-all transform hover:scale-[1.02] shadow-lg shadow-teal-500/25 flex items-center justify-center gap-2"
            >
              Weiter
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ) : step === 9 ? (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 py-4 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 transition-all transform hover:scale-[1.02] shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Plan wird erstellt...
              </>
            ) : (
              <>
                Weiter zur Registrierung
                <span className="text-xl">→</span>
              </>
            )}
          </button>
          ) : (
            <button
              type="button"
              onClick={nextStep}
              className="flex-1 py-4 rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 text-white font-semibold hover:from-teal-600 hover:to-teal-700 transition-all transform hover:scale-[1.02] shadow-lg shadow-teal-500/25 flex items-center justify-center gap-2"
            >
              Weiter
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>
      )}

      {/* CSS for animations */}
      <style jsx>{`
        @keyframes slide-in-left {
          from {
            opacity: 0;
            transform: translateX(30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes slide-in-right {
          from {
            opacity: 0;
            transform: translateX(-30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .animate-slide-in-left {
          animation: slide-in-left 0.3s ease-out forwards;
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
