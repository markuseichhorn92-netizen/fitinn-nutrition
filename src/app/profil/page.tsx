'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import BottomNav from '@/components/BottomNav';
import { loadProfile, saveProfile, clearAllData, clearAllPlans } from '@/lib/storage';
import { saveUserProfile, loadUserProfile, getStreak } from '@/lib/supabase-data';
import { getGoalLabel, getDietLabel, calculateWaterGoal, calculateTDEE, calculateTargetCalories } from '@/lib/calculations';
import { UserProfile } from '@/types';
import { useAuth } from '@/context/AuthContext';

const goals = [
  { id: 'lose', label: 'Abnehmen', emoji: '📉', color: 'bg-red-100 text-red-700 border-red-200' },
  { id: 'maintain', label: 'Gewicht halten', emoji: '⚖️', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { id: 'gain', label: 'Zunehmen', emoji: '📈', color: 'bg-green-100 text-green-700 border-green-200' },
];

const activityLevels = [
  { id: 'sedentary', label: 'Wenig aktiv', desc: 'Bürojob, wenig Bewegung' },
  { id: 'light', label: 'Leicht aktiv', desc: '1-2x Sport/Woche' },
  { id: 'moderate', label: 'Moderat aktiv', desc: '3-4x Sport/Woche' },
  { id: 'active', label: 'Sehr aktiv', desc: 'Täglich Sport' },
  { id: 'athlete', label: 'Athlet', desc: 'Intensives Training' },
];

export default function ProfilePage() {
  const router = useRouter();
  const { user, signOut, isLoading: authLoading } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [streak, setStreak] = useState({ current: 0, longest: 0, total: 0 });
  
  // Edit states
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [weightInput, setWeightInput] = useState('');
  const [selectedGoal, setSelectedGoal] = useState('');
  const [selectedActivity, setSelectedActivity] = useState('');
  const [showSaved, setShowSaved] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const storedProfile = await loadUserProfile();
        if (!storedProfile) {
          router.push('/onboarding');
          return;
        }
        setProfile(storedProfile);
        setWeightInput(storedProfile.weight.toString());
        setSelectedGoal(storedProfile.goal);
        setSelectedActivity(storedProfile.sportsFrequency || 'moderate');
        
        // Load streak
        const streakData = await getStreak();
        setStreak(streakData);
      } catch (err) {
        console.error('Error loading profile:', err);
      } finally {
        setIsLoading(false);
      }
    };
    
    const timeout = setTimeout(() => setIsLoading(false), 5000);
    if (!authLoading) loadData();
    return () => clearTimeout(timeout);
  }, [router, authLoading]);

  const handleSave = async (section: string) => {
    if (!profile) return;
    
    let updatedProfile = { ...profile };
    
    if (section === 'weight') {
      const newWeight = parseFloat(weightInput);
      if (isNaN(newWeight) || newWeight < 30 || newWeight > 300) return;
      updatedProfile.weight = newWeight;
    }
    
    if (section === 'goal') {
      updatedProfile.goal = selectedGoal as any;
    }
    
    if (section === 'activity') {
      updatedProfile.sportsFrequency = selectedActivity as any;
    }
    
    // Recalculate
    const tdee = calculateTDEE(updatedProfile);
    const targetCalories = calculateTargetCalories(tdee, updatedProfile.goal);
    updatedProfile.tdee = tdee;
    updatedProfile.targetCalories = targetCalories;
    
    // Save
    saveProfile(updatedProfile);
    await saveUserProfile(updatedProfile);
    
    setProfile(updatedProfile);
    setEditingSection(null);
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 2000);
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  const handleDeleteData = () => {
    clearAllData();
    router.push('/');
  };

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full mb-4" />
        <p className="text-gray-500 text-sm">Profil wird geladen...</p>
      </div>
    );
  }
  
  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4">😕</div>
          <h1 className="text-xl font-semibold mb-2">Kein Profil gefunden</h1>
          <p className="text-gray-500 mb-6">Erstelle ein neues Profil oder melde dich ab.</p>
          <div className="space-y-3">
            <button onClick={() => router.push('/onboarding')} className="w-full py-3 bg-teal-500 text-white rounded-xl font-medium">
              Neues Profil erstellen
            </button>
            {user && (
              <button onClick={handleSignOut} className="w-full py-3 border border-gray-300 text-gray-700 rounded-xl font-medium">
                Abmelden
              </button>
            )}
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  const currentGoal = goals.find(g => g.id === profile.goal) || goals[0];
  const bmi = (profile.weight / Math.pow(profile.height / 100, 2)).toFixed(1);

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-teal-500 to-teal-600 text-white px-6 pt-12 pb-20">
        <div className="flex items-center justify-between mb-6">
          <Link href="/plan" className="p-2 -ml-2 rounded-lg hover:bg-white/10">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-lg font-semibold">Profil & Einstellungen</h1>
          <div className="w-10" />
        </div>
        
        {/* User Info */}
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center text-3xl">
            {user?.user_metadata?.avatar_url ? (
              <Image 
                src={user.user_metadata.avatar_url} 
                alt="Avatar" 
                width={80} 
                height={80} 
                className="rounded-full"
              />
            ) : (
              '👤'
            )}
          </div>
          <div>
            <h2 className="text-xl font-bold">
              {user?.user_metadata?.full_name || user?.user_metadata?.name || 'Nutzer'}
            </h2>
            <p className="text-white/80 text-sm">{user?.email || 'Nicht angemeldet'}</p>
            {streak.current > 0 && (
              <div className="flex items-center gap-1 mt-1">
                <span className="text-lg">🔥</span>
                <span className="text-sm font-medium">{streak.current} Tage Streak</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="px-4 -mt-12">
        <div className="bg-white rounded-2xl shadow-lg p-4 grid grid-cols-4 gap-2">
          <div className="text-center">
            <p className="text-2xl font-bold text-teal-600">{profile.targetCalories}</p>
            <p className="text-xs text-gray-500">Kalorien/Tag</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-800">{profile.weight}</p>
            <p className="text-xs text-gray-500">kg</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-800">{bmi}</p>
            <p className="text-xs text-gray-500">BMI</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-orange-500">{streak.total}</p>
            <p className="text-xs text-gray-500">Tage aktiv</p>
          </div>
        </div>
      </div>

      {/* Saved Toast */}
      {showSaved && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-green-500 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg z-50 animate-in slide-in-from-top-2">
          ✓ Gespeichert
        </div>
      )}

      {/* Settings Sections */}
      <div className="px-4 mt-6 space-y-4">
        
        {/* Goal Section */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <button 
            onClick={() => setEditingSection(editingSection === 'goal' ? null : 'goal')}
            className="w-full px-4 py-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{currentGoal.emoji}</span>
              <div className="text-left">
                <p className="font-medium text-gray-900">Ziel</p>
                <p className="text-sm text-gray-500">{currentGoal.label}</p>
              </div>
            </div>
            <svg className={`w-5 h-5 text-gray-400 transition-transform ${editingSection === 'goal' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {editingSection === 'goal' && (
            <div className="px-4 pb-4 border-t border-gray-100 pt-4 space-y-2">
              {goals.map(goal => (
                <button
                  key={goal.id}
                  onClick={() => setSelectedGoal(goal.id)}
                  className={`w-full px-4 py-3 rounded-xl border-2 flex items-center gap-3 transition-all ${
                    selectedGoal === goal.id 
                      ? goal.color + ' border-current' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="text-xl">{goal.emoji}</span>
                  <span className="font-medium">{goal.label}</span>
                  {selectedGoal === goal.id && (
                    <svg className="w-5 h-5 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              ))}
              <button
                onClick={() => handleSave('goal')}
                className="w-full mt-3 py-3 bg-teal-500 text-white rounded-xl font-medium"
              >
                Speichern
              </button>
            </div>
          )}
        </div>

        {/* Weight Section */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <button 
            onClick={() => setEditingSection(editingSection === 'weight' ? null : 'weight')}
            className="w-full px-4 py-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚖️</span>
              <div className="text-left">
                <p className="font-medium text-gray-900">Gewicht</p>
                <p className="text-sm text-gray-500">{profile.weight} kg</p>
              </div>
            </div>
            <svg className={`w-5 h-5 text-gray-400 transition-transform ${editingSection === 'weight' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {editingSection === 'weight' && (
            <div className="px-4 pb-4 border-t border-gray-100 pt-4">
              <div className="flex gap-3">
                <input
                  type="number"
                  value={weightInput}
                  onChange={(e) => setWeightInput(e.target.value)}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-lg font-medium text-center"
                  min="30"
                  max="300"
                  step="0.1"
                />
                <span className="flex items-center text-gray-500 font-medium">kg</span>
              </div>
              <button
                onClick={() => handleSave('weight')}
                className="w-full mt-3 py-3 bg-teal-500 text-white rounded-xl font-medium"
              >
                Speichern
              </button>
            </div>
          )}
        </div>

        {/* Activity Level Section */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <button 
            onClick={() => setEditingSection(editingSection === 'activity' ? null : 'activity')}
            className="w-full px-4 py-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">🏃</span>
              <div className="text-left">
                <p className="font-medium text-gray-900">Aktivitätslevel</p>
                <p className="text-sm text-gray-500">
                  {activityLevels.find(a => a.id === profile.sportsFrequency)?.label || 'Moderat aktiv'}
                </p>
              </div>
            </div>
            <svg className={`w-5 h-5 text-gray-400 transition-transform ${editingSection === 'activity' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {editingSection === 'activity' && (
            <div className="px-4 pb-4 border-t border-gray-100 pt-4 space-y-2">
              {activityLevels.map(level => (
                <button
                  key={level.id}
                  onClick={() => setSelectedActivity(level.id)}
                  className={`w-full px-4 py-3 rounded-xl border-2 text-left transition-all ${
                    selectedActivity === level.id 
                      ? 'border-teal-500 bg-teal-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className="font-medium">{level.label}</p>
                  <p className="text-xs text-gray-500">{level.desc}</p>
                </button>
              ))}
              <button
                onClick={() => handleSave('activity')}
                className="w-full mt-3 py-3 bg-teal-500 text-white rounded-xl font-medium"
              >
                Speichern
              </button>
            </div>
          )}
        </div>

        {/* Profile Info (readonly) */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <h3 className="font-medium text-gray-900 mb-3">Profil-Info</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-gray-500">Alter</p>
              <p className="font-medium">{profile.age} Jahre</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-gray-500">Größe</p>
              <p className="font-medium">{profile.height} cm</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-gray-500">Geschlecht</p>
              <p className="font-medium">{profile.gender === 'male' ? 'Männlich' : profile.gender === 'female' ? 'Weiblich' : 'Divers'}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-gray-500">TDEE</p>
              <p className="font-medium">{profile.tdee} kcal</p>
            </div>
          </div>
          <Link 
            href="/onboarding" 
            className="block w-full mt-4 py-2 text-center text-teal-600 text-sm font-medium hover:bg-teal-50 rounded-xl transition-colors"
          >
            Profil neu erstellen →
          </Link>
        </div>

        {/* Account Section */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="font-medium text-gray-900">Account</h3>
          </div>
          
          {user ? (
            <button
              onClick={handleSignOut}
              className="w-full px-4 py-4 flex items-center gap-3 text-left hover:bg-gray-50 transition-colors"
            >
              <span className="text-xl">🚪</span>
              <span className="font-medium text-gray-700">Abmelden</span>
            </button>
          ) : (
            <Link
              href="/"
              className="w-full px-4 py-4 flex items-center gap-3 text-left hover:bg-gray-50 transition-colors"
            >
              <span className="text-xl">🔑</span>
              <span className="font-medium text-teal-600">Anmelden</span>
            </Link>
          )}
        </div>

        {/* Danger Zone */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="font-medium text-red-600">Gefahrenzone</h3>
          </div>
          
          <button
            onClick={() => clearAllPlans()}
            className="w-full px-4 py-4 flex items-center gap-3 text-left hover:bg-red-50 transition-colors border-b border-gray-100"
          >
            <span className="text-xl">🗑️</span>
            <div>
              <p className="font-medium text-gray-700">Mahlzeitenpläne löschen</p>
              <p className="text-xs text-gray-500">Alle gespeicherten Pläne entfernen</p>
            </div>
          </button>
          
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full px-4 py-4 flex items-center gap-3 text-left hover:bg-red-50 transition-colors"
            >
              <span className="text-xl">💣</span>
              <div>
                <p className="font-medium text-red-600">Alle Daten löschen</p>
                <p className="text-xs text-gray-500">Profil und alle Daten entfernen</p>
              </div>
            </button>
          ) : (
            <div className="px-4 py-4 bg-red-50">
              <p className="text-sm text-red-600 mb-3">Bist du sicher? Diese Aktion kann nicht rückgängig gemacht werden.</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-2 border border-gray-300 rounded-xl font-medium text-gray-700"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleDeleteData}
                  className="flex-1 py-2 bg-red-500 text-white rounded-xl font-medium"
                >
                  Löschen
                </button>
              </div>
            </div>
          )}
        </div>

        {/* App Info */}
        <div className="text-center py-6 text-xs text-gray-400">
          <p>Nährkraft v1.0</p>
          <p>powered by FIT-INN Trier</p>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
