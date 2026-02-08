'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const waterGoal = calculateWaterGoal(profile.weight, profile.sportsFrequency);
  const bmi = (profile.weight / Math.pow(profile.height / 100, 2)).toFixed(1);
  const weightDiff = profile.weight - profile.targetWeight;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white px-6 py-8 text-center border-b border-gray-100">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 mx-auto mb-4 flex items-center justify-center shadow-lg">
          <span className="text-4xl">
            {profile.gender === 'male' ? '👨' : profile.gender === 'female' ? '👩' : '🧑'}
          </span>
        </div>
        <h1 className="text-2xl font-bold mb-1 text-gray-900">Dein Profil</h1>
        <p className="text-gray-500">FIT-INN Mitglied</p>
      </div>

      {/* Stats Cards */}
      <div className="px-4 py-4 -mt-4">
        <div className="grid grid-cols-3 gap-3">
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
      </div>

      {/* Goal Progress */}
      <div className="px-4 mb-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="font-semibold text-gray-900">Ziel-Fortschritt</span>
            <span className="text-sm text-gray-500">
              {Math.abs(weightDiff)} kg {weightDiff > 0 ? 'zu verlieren' : weightDiff < 0 ? 'zuzunehmen' : '✓'}
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
      </div>

      {/* Profile Details */}
      <div className="px-4 mb-4">
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
          <div className="p-4 flex justify-between">
            <span className="text-gray-500">Wasserziel</span>
            <span className="font-medium text-gray-900">{waterGoal.toFixed(1)}L / Tag</span>
          </div>
          <div className="p-4 flex justify-between">
            <span className="text-gray-500">Sport pro Woche</span>
            <span className="font-medium text-gray-900">{profile.sportsFrequency}x</span>
          </div>
        </div>
      </div>

      {/* Allergies & Preferences */}
      {(profile.allergies?.length > 0 || profile.excludedFoods?.length > 0) && (
        <div className="px-4 mb-4">
          <h2 className="text-lg font-semibold mb-3 text-gray-900 px-2">Allergien & Ausschlüsse</h2>
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex flex-wrap gap-2">
              {profile.allergies?.map(a => (
                <span key={a} className="px-3 py-1 rounded-full bg-red-100 text-red-600 text-sm">
                  {a}
                </span>
              ))}
              {profile.excludedFoods?.map(f => (
                <span key={f} className="px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-sm">
                  Kein {f}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="px-4 space-y-3">
        <button
          onClick={handleEditProfile}
          className="w-full py-4 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 transition-colors"
        >
          Profil bearbeiten
        </button>
        
        <button
          onClick={handleLogout}
          className="w-full py-4 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition-colors"
        >
          Abmelden
        </button>

        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="w-full py-4 rounded-xl text-red-500 font-semibold hover:bg-red-50 transition-colors"
        >
          Alle Daten löschen
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-xl font-bold mb-2 text-gray-900">Wirklich löschen?</h3>
            <p className="text-gray-500 mb-6">
              Alle deine Daten, Pläne und Favoriten werden unwiderruflich gelöscht.
            </p>
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
