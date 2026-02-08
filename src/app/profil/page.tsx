'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import BottomNav from '@/components/BottomNav';
import { loadProfile, clearAllData } from '@/lib/storage';
import { getGoalLabel, getDietLabel, calculateWaterGoal } from '@/lib/calculations';
import { UserProfile } from '@/types';

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    const storedProfile = loadProfile();
    if (!storedProfile) {
      router.push('/onboarding');
      return;
    }
    setProfile(storedProfile);
  }, [router]);

  const handleLogout = () => {
    router.push('/');
  };

  const handleDeleteData = () => {
    clearAllData();
    router.push('/');
  };

  const handleEditProfile = () => {
    router.push('/onboarding');
  };

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const waterGoal = calculateWaterGoal(profile.weight, profile.sportsFrequency);
  const bmi = (profile.weight / Math.pow(profile.height / 100, 2)).toFixed(1);
  const weightDiff = profile.weight - profile.targetWeight;

  return (
    <div className="min-h-screen bg-gray-50 pb-24 lg:pb-8">
      {/* Desktop Header */}
      <div className="hidden lg:block sticky top-0 bg-white z-20 border-b border-gray-100 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/plan" className="p-2 rounded-xl hover:bg-gray-100 text-gray-600 transition-colors">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
                <span className="text-2xl">
                  {profile.gender === 'male' ? '👨' : profile.gender === 'female' ? '👩' : '🧑'}
                </span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Dein Profil</h1>
                <p className="text-sm text-gray-500">FIT-INN Mitglied</p>
              </div>
            </div>
          </div>
          <button
            onClick={handleEditProfile}
            className="px-5 py-2.5 rounded-xl bg-teal-600 text-white font-medium hover:bg-teal-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Bearbeiten
          </button>
        </div>
      </div>

      {/* Mobile Header */}
      <div className="lg:hidden bg-white px-6 py-8 text-center border-b border-gray-100">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 mx-auto mb-4 flex items-center justify-center shadow-lg">
          <span className="text-4xl">
            {profile.gender === 'male' ? '👨' : profile.gender === 'female' ? '👩' : '🧑'}
          </span>
        </div>
        <h1 className="text-2xl font-bold mb-1 text-gray-900">Dein Profil</h1>
        <p className="text-gray-500">FIT-INN Mitglied</p>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 lg:px-6 py-4 lg:py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-3 lg:gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 text-center shadow-sm">
            <p className="text-2xl lg:text-3xl font-bold text-teal-600">{profile.weight}</p>
            <p className="text-xs lg:text-sm text-gray-500">kg aktuell</p>
          </div>
          <div className="bg-white rounded-xl p-4 text-center shadow-sm">
            <p className="text-2xl lg:text-3xl font-bold text-orange-500">{profile.targetWeight}</p>
            <p className="text-xs lg:text-sm text-gray-500">kg Ziel</p>
          </div>
          <div className="bg-white rounded-xl p-4 text-center shadow-sm">
            <p className="text-2xl lg:text-3xl font-bold text-blue-500">{bmi}</p>
            <p className="text-xs lg:text-sm text-gray-500">BMI</p>
          </div>
          <div className="hidden lg:block bg-white rounded-xl p-4 text-center shadow-sm">
            <p className="text-2xl lg:text-3xl font-bold text-purple-500">{profile.height}</p>
            <p className="text-xs lg:text-sm text-gray-500">cm Größe</p>
          </div>
          <div className="hidden lg:block bg-white rounded-xl p-4 text-center shadow-sm">
            <p className="text-2xl lg:text-3xl font-bold text-green-500">{profile.age}</p>
            <p className="text-xs lg:text-sm text-gray-500">Jahre</p>
          </div>
          <div className="hidden lg:block bg-white rounded-xl p-4 text-center shadow-sm">
            <p className="text-2xl lg:text-3xl font-bold text-cyan-500">{waterGoal.toFixed(1)}L</p>
            <p className="text-xs lg:text-sm text-gray-500">Wasserziel</p>
          </div>
        </div>

        {/* Goal Progress */}
        <div className="bg-white rounded-2xl p-5 shadow-sm mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="font-semibold text-gray-900 text-lg">Ziel-Fortschritt</span>
            <span className="text-sm text-gray-500">
              {Math.abs(weightDiff)} kg {weightDiff > 0 ? 'zu verlieren' : weightDiff < 0 ? 'zuzunehmen' : '✓ Erreicht!'}
            </span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-teal-500 to-teal-400 rounded-full transition-all"
              style={{ 
                width: weightDiff === 0 ? '100%' : 
                  `${Math.max(0, Math.min(100, (1 - Math.abs(weightDiff) / Math.abs(profile.weight - profile.targetWeight || 1)) * 100))}%` 
              }}
            />
          </div>
        </div>

        {/* Two Column Layout for Desktop */}
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
                <span className="text-gray-500">Kalorienziel</span>
                <span className="font-medium text-gray-900">{profile.targetCalories} kcal</span>
              </div>
              <div className="p-4 flex justify-between">
                <span className="text-gray-500">Protein</span>
                <span className="font-medium text-gray-900">{profile.macros?.protein}g / Tag</span>
              </div>
              <div className="p-4 flex justify-between">
                <span className="text-gray-500">Kohlenhydrate</span>
                <span className="font-medium text-gray-900">{profile.macros?.carbs}g / Tag</span>
              </div>
              <div className="p-4 flex justify-between">
                <span className="text-gray-500">Fett</span>
                <span className="font-medium text-gray-900">{profile.macros?.fat}g / Tag</span>
              </div>
              <div className="p-4 flex justify-between">
                <span className="text-gray-500">Ernährungsform</span>
                <span className="font-medium text-gray-900">{getDietLabel(profile.dietType)}</span>
              </div>
              <div className="p-4 flex justify-between lg:hidden">
                <span className="text-gray-500">Wasserziel</span>
                <span className="font-medium text-gray-900">{waterGoal.toFixed(1)}L / Tag</span>
              </div>
              <div className="p-4 flex justify-between">
                <span className="text-gray-500">Sport pro Woche</span>
                <span className="font-medium text-gray-900">{profile.sportsFrequency}x</span>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div>
            {/* Allergies & Preferences */}
            {(profile.allergies?.length > 0 || profile.excludedFoods?.length > 0) && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold mb-3 text-gray-900 px-2">Allergien & Ausschlüsse</h2>
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                  <div className="flex flex-wrap gap-2">
                    {profile.allergies?.map(a => (
                      <span key={a} className="px-3 py-1.5 rounded-full bg-red-100 text-red-600 text-sm font-medium">
                        ⚠️ {a}
                      </span>
                    ))}
                    {profile.excludedFoods?.map(f => (
                      <span key={f} className="px-3 py-1.5 rounded-full bg-gray-100 text-gray-600 text-sm font-medium">
                        🚫 {f}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-3">
              <button
                onClick={handleEditProfile}
                className="lg:hidden w-full py-4 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 transition-colors"
              >
                Profil bearbeiten
              </button>
              
              <button
                onClick={handleLogout}
                className="w-full py-4 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Abmelden
              </button>

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
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2 text-gray-900">Wirklich löschen?</h3>
              <p className="text-gray-500">
                Alle deine Daten, Pläne und Favoriten werden unwiderruflich gelöscht.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-3 rounded-xl bg-gray-100 font-semibold text-gray-700 hover:bg-gray-200 transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={handleDeleteData}
                className="flex-1 py-3 rounded-xl bg-red-500 text-white font-semibold hover:bg-red-600 transition-colors"
              >
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
