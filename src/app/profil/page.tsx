'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import BottomNav from '@/components/BottomNav';
import { loadProfile, saveProfile, clearAllData } from '@/lib/storage';
import { saveUserProfile, loadUserProfile } from '@/lib/supabase-data';
import { getGoalLabel, getDietLabel, calculateWaterGoal, calculateTDEE, calculateTargetCalories } from '@/lib/calculations';
import { UserProfile } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { resetTutorialState } from '@/components/PlanTutorial';

export default function ProfilePage() {
  const router = useRouter();
  const { user, signOut, isLoading: authLoading } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [weightInput, setWeightInput] = useState('');
  const [showWeightSaved, setShowWeightSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      // Try to load from Supabase first (if authenticated), then localStorage
      const storedProfile = await loadUserProfile();
      if (!storedProfile) {
        router.push('/onboarding');
        return;
      }
      setProfile(storedProfile);
      setWeightInput(storedProfile.weight.toString());
      setIsLoading(false);
    };
    
    if (!authLoading) {
      loadData();
    }
  }, [router, authLoading]);

  const handleDeleteData = () => {
    clearAllData();
    router.push('/');
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  const handleUpdateWeight = async () => {
    if (!profile) return;
    const newWeight = parseFloat(weightInput);
    if (isNaN(newWeight) || newWeight < 30 || newWeight > 300) return;
    
    const updatedProfile = { ...profile, weight: newWeight };
    // Recalculate TDEE and target calories
    const tdee = calculateTDEE(updatedProfile);
    const targetCalories = calculateTargetCalories(tdee, updatedProfile.goal);
    updatedProfile.tdee = tdee;
    updatedProfile.targetCalories = targetCalories;
    
    // Save to both localStorage and Supabase
    saveProfile(updatedProfile);
    await saveUserProfile(updatedProfile);
    
    setProfile(updatedProfile);
    setShowWeightSaved(true);
    setTimeout(() => setShowWeightSaved(false), 2000);
  };

  if (isLoading || authLoading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const waterGoal = calculateWaterGoal(profile.weight, profile.sportsFrequency);
  const bmi = (profile.weight / Math.pow(profile.height / 100, 2)).toFixed(1);
  const tdee = profile.tdee || calculateTDEE(profile);
  const targetCalories = profile.targetCalories || calculateTargetCalories(tdee, profile.goal);

  // Macro calculations
  const proteinCal = (profile.macros?.protein || 0) * 4;
  const carbsCal = (profile.macros?.carbs || 0) * 4;
  const fatCal = (profile.macros?.fat || 0) * 9;
  const totalMacroCal = proteinCal + carbsCal + fatCal;
  const proteinPct = totalMacroCal > 0 ? Math.round((proteinCal / totalMacroCal) * 100) : 0;
  const carbsPct = totalMacroCal > 0 ? Math.round((carbsCal / totalMacroCal) * 100) : 0;
  const fatPct = totalMacroCal > 0 ? Math.round((fatCal / totalMacroCal) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50 pb-24 lg:pb-8">
      {/* Header */}
      <div className="bg-white px-6 py-8 text-center border-b border-gray-100 lg:py-6">
        <div className="max-w-4xl mx-auto lg:flex lg:items-center lg:justify-between lg:text-left">
          <div className="lg:flex lg:items-center lg:gap-4">
            <div className="w-20 h-20 lg:w-16 lg:h-16 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 mx-auto lg:mx-0 mb-3 lg:mb-0 flex items-center justify-center shadow-lg">
              <span className="text-3xl lg:text-2xl">
                {profile.gender === 'male' ? '👨' : profile.gender === 'female' ? '👩' : '🧑'}
              </span>
            </div>
            <div>
              <h1 className="text-2xl lg:text-xl font-bold mb-1 text-gray-900">Dein Profil</h1>
              {user ? (
                <p className="text-gray-500 text-sm flex items-center justify-center lg:justify-start gap-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  {user.email}
                </p>
              ) : (
                <p className="text-gray-500 text-sm">FIT-INN Mitglied (lokal)</p>
              )}
            </div>
          </div>
          <button
            onClick={() => router.push('/onboarding')}
            className="hidden lg:flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 text-white font-medium hover:bg-teal-700 transition-colors"
          >
            🔄 Onboarding wiederholen
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 lg:px-6 py-4 lg:py-6">
        {/* Cloud Sync Status */}
        {!user && (
          <div className="bg-gradient-to-r from-teal-50 to-emerald-50 rounded-2xl p-4 mb-6 border border-teal-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-800">Daten in der Cloud sichern</p>
                <p className="text-sm text-gray-600">Melde dich an, um deine Pläne geräteübergreifend zu synchronisieren.</p>
              </div>
              <Link
                href="/login"
                className="px-4 py-2 bg-teal-600 text-white rounded-xl text-sm font-medium hover:bg-teal-700 transition-colors"
              >
                Anmelden
              </Link>
            </div>
          </div>
        )}

        {/* TDEE & Kalorienziel - Prominent */}
        <div className="bg-white rounded-2xl p-5 shadow-sm mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">🔥 Dein Energiebedarf</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-gray-800">{tdee}</p>
              <p className="text-sm text-gray-500 mt-1">TDEE (kcal/Tag)</p>
              <p className="text-xs text-gray-400">Grundumsatz + Aktivität</p>
            </div>
            <div className="bg-teal-50 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-teal-600">{targetCalories}</p>
              <p className="text-sm text-gray-500 mt-1">Kalorienziel (kcal/Tag)</p>
              <p className="text-xs text-gray-400">{getGoalLabel(profile.goal)}</p>
            </div>
          </div>

          {/* Makro-Verteilung als Balken */}
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Makro-Verteilung</h3>
          <div className="space-y-3">
            {/* Protein */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">🥩 Protein</span>
                <span className="font-medium text-gray-900">{profile.macros?.protein || 0}g <span className="text-gray-400">({proteinPct}%)</span></span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-red-400 rounded-full transition-all" style={{ width: `${proteinPct}%` }} />
              </div>
            </div>
            {/* Carbs */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">🌾 Kohlenhydrate</span>
                <span className="font-medium text-gray-900">{profile.macros?.carbs || 0}g <span className="text-gray-400">({carbsPct}%)</span></span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-yellow-400 rounded-full transition-all" style={{ width: `${carbsPct}%` }} />
              </div>
            </div>
            {/* Fat */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">🥑 Fett</span>
                <span className="font-medium text-gray-900">{profile.macros?.fat || 0}g <span className="text-gray-400">({fatPct}%)</span></span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-400 rounded-full transition-all" style={{ width: `${fatPct}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white rounded-xl p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-teal-600">{profile.weight}</p>
            <p className="text-xs text-gray-500">kg aktuell</p>
          </div>
          <div className="bg-white rounded-xl p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-orange-500">{profile.targetWeight}</p>
            <p className="text-xs text-gray-500">kg Ziel</p>
          </div>
          <div className="bg-white rounded-xl p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-blue-500">{bmi}</p>
            <p className="text-xs text-gray-500">BMI</p>
          </div>
        </div>

        {/* Gewicht aktualisieren */}
        <div className="bg-white rounded-2xl p-5 shadow-sm mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">⚖️ Gewicht aktualisieren</h2>
          <div className="flex gap-3">
            <input
              type="number"
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
              className="flex-1 px-4 py-3 rounded-xl bg-gray-100 border-0 text-gray-900 font-medium focus:ring-2 focus:ring-teal-500 focus:bg-white transition-colors"
              placeholder="Gewicht in kg"
              step="0.1"
              min="30"
              max="300"
            />
            <button
              onClick={handleUpdateWeight}
              className="px-6 py-3 rounded-xl bg-teal-600 text-white font-medium hover:bg-teal-700 transition-colors"
            >
              {showWeightSaved ? '✓ Gespeichert' : 'Aktualisieren'}
            </button>
          </div>
        </div>

        <div className="lg:grid lg:grid-cols-2 lg:gap-6">
          {/* Profile Details */}
          <div className="mb-6 lg:mb-0">
            <h2 className="text-lg font-semibold mb-3 text-gray-900 px-2">Deine Einstellungen</h2>
            <div className="bg-white rounded-2xl divide-y divide-gray-100 shadow-sm">
              <div className="p-4 flex justify-between">
                <span className="text-gray-500">Ziel</span>
                <span className="font-medium text-gray-900">{getGoalLabel(profile.goal)}</span>
              </div>
              <div className="p-4 flex justify-between">
                <span className="text-gray-500">Ernährungsform</span>
                <span className="font-medium text-gray-900">{getDietLabel(profile.dietType)}</span>
              </div>
              <div className="p-4 flex justify-between">
                <span className="text-gray-500">Größe</span>
                <span className="font-medium text-gray-900">{profile.height} cm</span>
              </div>
              <div className="p-4 flex justify-between">
                <span className="text-gray-500">Alter</span>
                <span className="font-medium text-gray-900">{profile.age} Jahre</span>
              </div>
              <div className="p-4 flex justify-between">
                <span className="text-gray-500">Sport pro Woche</span>
                <span className="font-medium text-gray-900">{profile.sportsFrequency}x</span>
              </div>
              <div className="p-4 flex justify-between">
                <span className="text-gray-500">Wasserziel</span>
                <span className="font-medium text-gray-900">{waterGoal.toFixed(1)}L / Tag</span>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div>
            {/* Allergies */}
            {(profile.allergies?.length > 0 || profile.excludedFoods?.length > 0) && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold mb-3 text-gray-900 px-2">Allergien & Ausschlüsse</h2>
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                  <div className="flex flex-wrap gap-2">
                    {profile.allergies?.map(a => (
                      <span key={a} className="px-3 py-1.5 rounded-full bg-red-100 text-red-600 text-sm font-medium">⚠️ {a}</span>
                    ))}
                    {profile.excludedFoods?.map(f => (
                      <span key={f} className="px-3 py-1.5 rounded-full bg-gray-100 text-gray-600 text-sm font-medium">🚫 {f}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-3">
              <button
                onClick={() => router.push('/onboarding')}
                className="lg:hidden w-full py-4 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 transition-colors"
              >
                🔄 Onboarding wiederholen
              </button>

              <Link
                href="/favoriten"
                className="w-full py-4 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
              >
                ❤️ Meine Favoriten
              </Link>

              <button
                onClick={() => {
                  resetTutorialState();
                  router.push('/plan');
                }}
                className="w-full py-4 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
              >
                📖 App-Anleitung anzeigen
              </button>

              {user ? (
                <button
                  onClick={handleSignOut}
                  className="w-full py-4 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Abmelden
                </button>
              ) : (
                <Link
                  href="/login"
                  className="w-full py-4 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  Anmelden
                </Link>
              )}

              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full py-4 rounded-xl text-red-500 font-semibold hover:bg-red-50 transition-colors border border-red-200"
              >
                Alle Daten löschen
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <div className="text-center mb-4">
              <span className="text-4xl block mb-3">⚠️</span>
              <h3 className="text-xl font-bold mb-2 text-gray-900">Wirklich löschen?</h3>
              <p className="text-gray-500">Alle deine Daten, Pläne und Favoriten werden unwiderruflich gelöscht.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-3 rounded-xl bg-gray-100 font-semibold text-gray-700 hover:bg-gray-200 transition-colors">
                Abbrechen
              </button>
              <button onClick={handleDeleteData} className="flex-1 py-3 rounded-xl bg-red-500 text-white font-semibold hover:bg-red-600 transition-colors">
                Löschen
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
