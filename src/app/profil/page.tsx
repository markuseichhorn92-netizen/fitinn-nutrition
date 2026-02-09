'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import BottomNav from '@/components/BottomNav';
import { loadProfile, saveProfile, clearAllData } from '@/lib/storage';
import { getGoalLabel, getDietLabel, calculateWaterGoal, calculateTDEE, calculateTargetCalories } from '@/lib/calculations';
import { UserProfile } from '@/types';

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedProfile = loadProfile();
    if (!storedProfile) {
      router.push('/onboarding');
      return;
    }
    setProfile(storedProfile);
    setIsLoading(false);
  }, [router]);

  const handleDeleteData = () => {
    clearAllData();
    router.push('/');
  };

  if (isLoading || !profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <div className="animate-spin w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full mb-4" />
        <p className="text-gray-500">Profil wird geladen...</p>
      </div>
    );
  }

  const targetCalories = profile.targetCalories || calculateTargetCalories(calculateTDEE(profile), profile.goal);

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white px-5 py-6 border-b border-gray-100 safe-area-top">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center shadow-lg">
            <span className="text-3xl">
              {profile.gender === 'male' ? '👨' : profile.gender === 'female' ? '👩' : '🧑'}
            </span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Dein Profil</h1>
            <p className="text-gray-500">FIT-INN Mitglied</p>
          </div>
        </div>
      </div>

      <div className="px-5 py-5 space-y-5">
        {/* Big Calorie Display */}
        <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl p-6 text-center text-white shadow-lg">
          <p className="text-teal-100 mb-1">Dein Tagesziel</p>
          <p className="text-5xl font-bold">{targetCalories}</p>
          <p className="text-teal-100 mt-1">Kalorien pro Tag</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl p-4 text-center shadow-sm">
            <p className="text-3xl font-bold text-gray-900">{profile.weight}</p>
            <p className="text-sm text-gray-500">kg</p>
          </div>
          <div className="bg-white rounded-2xl p-4 text-center shadow-sm">
            <p className="text-3xl font-bold text-gray-900">{profile.height}</p>
            <p className="text-sm text-gray-500">cm</p>
          </div>
          <div className="bg-white rounded-2xl p-4 text-center shadow-sm">
            <p className="text-3xl font-bold text-gray-900">{profile.age}</p>
            <p className="text-sm text-gray-500">Jahre</p>
          </div>
        </div>

        {/* Settings */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xl">🎯</span>
              <span className="text-gray-700">Ziel</span>
            </div>
            <span className="font-semibold text-gray-900">{getGoalLabel(profile.goal)}</span>
          </div>
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xl">🥗</span>
              <span className="text-gray-700">Ernährung</span>
            </div>
            <span className="font-semibold text-gray-900">{getDietLabel(profile.dietType)}</span>
          </div>
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xl">🏃</span>
              <span className="text-gray-700">Training</span>
            </div>
            <span className="font-semibold text-gray-900">{profile.sportsFrequency}x pro Woche</span>
          </div>
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xl">💧</span>
              <span className="text-gray-700">Wasserziel</span>
            </div>
            <span className="font-semibold text-gray-900">{calculateWaterGoal(profile.weight, profile.sportsFrequency).toFixed(1)} L</span>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={() => router.push('/onboarding')}
            className="w-full py-5 rounded-2xl bg-teal-600 text-white font-bold text-lg active:scale-[0.98] transition-transform touch-manipulation shadow-lg shadow-teal-500/30"
          >
            🔄 Profil neu einrichten
          </button>

          <Link
            href="/favoriten"
            className="w-full py-4 rounded-2xl bg-white text-gray-700 font-semibold text-center flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] transition-transform touch-manipulation"
          >
            ❤️ Meine Favoriten
          </Link>

          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full py-4 rounded-2xl text-red-500 font-semibold border-2 border-red-200 active:bg-red-50 transition-colors touch-manipulation"
          >
            🗑️ Alle Daten löschen
          </button>
        </div>

        {/* Version Info */}
        <p className="text-center text-gray-400 text-sm pt-4">
          FIT-INN Nutrition v1.0
        </p>
      </div>

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowDeleteConfirm(false)} />
          <div className="fixed inset-x-4 bottom-8 z-50 animate-slide-up safe-area-bottom">
            <div className="bg-white rounded-3xl p-6 shadow-2xl">
              <div className="text-center mb-6">
                <span className="text-5xl block mb-3">⚠️</span>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Wirklich löschen?</h3>
                <p className="text-gray-500">Alle Daten werden unwiderruflich gelöscht.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setShowDeleteConfirm(false)} 
                  className="py-4 rounded-2xl bg-gray-100 font-semibold text-gray-700 active:bg-gray-200 transition-colors touch-manipulation"
                >
                  Abbrechen
                </button>
                <button 
                  onClick={handleDeleteData} 
                  className="py-4 rounded-2xl bg-red-500 text-white font-semibold active:bg-red-600 transition-colors touch-manipulation"
                >
                  Löschen
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <BottomNav />
    </div>
  );
}
