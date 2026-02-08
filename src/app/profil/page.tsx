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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const waterGoal = calculateWaterGoal(profile.weight, profile.sportsFrequency);
  const bmi = (profile.weight / Math.pow(profile.height / 100, 2)).toFixed(1);
  const weightDiff = profile.weight - profile.targetWeight;

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="px-6 py-8 text-center">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 mx-auto mb-4 flex items-center justify-center">
          <span className="text-4xl">
            {profile.gender === 'male' ? '👨' : profile.gender === 'female' ? '👩' : '🧑'}
          </span>
        </div>
        <h1 className="text-2xl font-bold mb-1">Dein Profil</h1>
        <p className="text-dark-400">FIT-INN Mitglied</p>
      </div>

      {/* Stats Cards */}
      <div className="px-6 mb-6">
        <div className="grid grid-cols-3 gap-3">
          <div className="glass rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-primary-400">{profile.weight}</p>
            <p className="text-xs text-dark-400">kg aktuell</p>
          </div>
          <div className="glass rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-accent-400">{profile.targetWeight}</p>
            <p className="text-xs text-dark-400">kg Ziel</p>
          </div>
          <div className="glass rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-blue-400">{bmi}</p>
            <p className="text-xs text-dark-400">BMI</p>
          </div>
        </div>
      </div>

      {/* Goal Progress */}
      <div className="px-6 mb-6">
        <div className="glass rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="font-semibold">Ziel-Fortschritt</span>
            <span className="text-sm text-dark-400">
              {Math.abs(weightDiff)} kg {weightDiff > 0 ? 'zu verlieren' : weightDiff < 0 ? 'zuzunehmen' : '✓'}
            </span>
          </div>
          <div className="h-3 bg-dark-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary-500 to-primary-400 rounded-full transition-all"
              style={{ 
                width: weightDiff === 0 ? '100%' : 
                  `${Math.max(0, Math.min(100, (1 - Math.abs(weightDiff) / Math.abs(profile.weight - profile.targetWeight || 1)) * 100))}%` 
              }}
            />
          </div>
        </div>
      </div>

      {/* Profile Details */}
      <div className="px-6 mb-6">
        <h2 className="text-lg font-semibold mb-3">Deine Einstellungen</h2>
        <div className="glass rounded-2xl divide-y divide-dark-700">
          <div className="p-4 flex justify-between">
            <span className="text-dark-400">Ziel</span>
            <span className="font-medium">{getGoalLabel(profile.goal)}</span>
          </div>
          <div className="p-4 flex justify-between">
            <span className="text-dark-400">Kalorienziel</span>
            <span className="font-medium">{profile.targetCalories} kcal</span>
          </div>
          <div className="p-4 flex justify-between">
            <span className="text-dark-400">Protein</span>
            <span className="font-medium">{profile.macros?.protein}g / Tag</span>
          </div>
          <div className="p-4 flex justify-between">
            <span className="text-dark-400">Kohlenhydrate</span>
            <span className="font-medium">{profile.macros?.carbs}g / Tag</span>
          </div>
          <div className="p-4 flex justify-between">
            <span className="text-dark-400">Fett</span>
            <span className="font-medium">{profile.macros?.fat}g / Tag</span>
          </div>
          <div className="p-4 flex justify-between">
            <span className="text-dark-400">Ernährungsform</span>
            <span className="font-medium">{getDietLabel(profile.dietType)}</span>
          </div>
          <div className="p-4 flex justify-between">
            <span className="text-dark-400">Wasserziel</span>
            <span className="font-medium">{waterGoal.toFixed(1)}L / Tag</span>
          </div>
          <div className="p-4 flex justify-between">
            <span className="text-dark-400">Sport pro Woche</span>
            <span className="font-medium">{profile.sportsFrequency}x</span>
          </div>
        </div>
      </div>

      {/* Allergies & Preferences */}
      {(profile.allergies?.length > 0 || profile.excludedFoods?.length > 0) && (
        <div className="px-6 mb-6">
          <h2 className="text-lg font-semibold mb-3">Allergien & Ausschlüsse</h2>
          <div className="flex flex-wrap gap-2">
            {profile.allergies?.map(a => (
              <span key={a} className="px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-sm">
                {a}
              </span>
            ))}
            {profile.excludedFoods?.map(f => (
              <span key={f} className="px-3 py-1 rounded-full bg-dark-700 text-dark-300 text-sm">
                Kein {f}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="px-6 space-y-3">
        <button
          onClick={handleEditProfile}
          className="w-full py-4 rounded-xl bg-primary-500 text-white font-semibold"
        >
          Profil bearbeiten
        </button>
        
        <button
          onClick={handleLogout}
          className="w-full py-4 rounded-xl bg-dark-700 text-white font-semibold"
        >
          Abmelden
        </button>

        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="w-full py-4 rounded-xl text-red-400 font-semibold"
        >
          Alle Daten löschen
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-dark-950/90 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="glass rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-xl font-bold mb-2">Wirklich löschen?</h3>
            <p className="text-dark-400 mb-6">
              Alle deine Daten, Pläne und Favoriten werden unwiderruflich gelöscht.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-3 rounded-xl bg-dark-700 font-semibold"
              >
                Abbrechen
              </button>
              <button
                onClick={handleDeleteData}
                className="flex-1 py-3 rounded-xl bg-red-500 font-semibold"
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
