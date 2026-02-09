'use client';

import { useState, useEffect } from 'react';
import { getStreak, updateStreak } from '@/lib/supabase-data';
import { useAuth } from '@/context/AuthContext';

interface StreakData {
  current: number;
  longest: number;
  total: number;
}

export default function StreakWidget() {
  const { user } = useAuth();
  const [streak, setStreak] = useState<StreakData>({ current: 0, longest: 0, total: 0 });
  const [showDetails, setShowDetails] = useState(false);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    const loadStreak = async () => {
      if (user) {
        // Update streak (marks today as active) and get current values
        const data = await updateStreak();
        setStreak(data);
        
        // Animate if streak > 0
        if (data.current > 0) {
          setAnimating(true);
          setTimeout(() => setAnimating(false), 1000);
        }
      } else {
        // For non-logged in users, use localStorage
        const stored = localStorage.getItem('fitinn_streak');
        if (stored) {
          try {
            const data = JSON.parse(stored);
            setStreak(data);
          } catch (e) {}
        }
      }
    };
    
    loadStreak();
  }, [user]);

  // Flame color based on streak
  const getFlameColor = (streak: number) => {
    if (streak >= 30) return 'text-purple-500'; // Epic
    if (streak >= 14) return 'text-orange-500'; // Fire
    if (streak >= 7) return 'text-yellow-500'; // Hot
    if (streak >= 3) return 'text-orange-400'; // Warm
    return 'text-gray-400'; // Cold
  };

  // Milestone messages
  const getMilestoneMessage = (streak: number) => {
    if (streak >= 30) return '🏆 Unaufhaltsam!';
    if (streak >= 14) return '🔥 Zwei Wochen stark!';
    if (streak >= 7) return '💪 Eine Woche geschafft!';
    if (streak >= 3) return '👍 Guter Start!';
    if (streak >= 1) return 'Weiter so!';
    return 'Starte deine Serie!';
  };

  // Days of week indicator
  const today = new Date().getDay();
  const weekDays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
  const orderedDays = [...weekDays];

  return (
    <div 
      className="bg-white rounded-2xl p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => setShowDetails(!showDetails)}
    >
      {/* Main Streak Display */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Flame Icon */}
          <div className={`relative ${animating ? 'animate-bounce' : ''}`}>
            <span className={`text-4xl ${getFlameColor(streak.current)}`}>
              🔥
            </span>
            {streak.current >= 7 && (
              <span className="absolute -top-1 -right-1 text-xs">✨</span>
            )}
          </div>
          
          {/* Streak Number */}
          <div>
            <div className="flex items-baseline gap-1">
              <span className={`text-3xl font-bold ${streak.current > 0 ? 'text-orange-500' : 'text-gray-400'}`}>
                {streak.current}
              </span>
              <span className="text-sm text-gray-500">
                {streak.current === 1 ? 'Tag' : 'Tage'}
              </span>
            </div>
            <p className="text-xs text-gray-500">in Folge</p>
          </div>
        </div>

        {/* Milestone Badge */}
        <div className="text-right">
          <p className="text-sm font-medium text-gray-700">
            {getMilestoneMessage(streak.current)}
          </p>
          {streak.longest > streak.current && (
            <p className="text-xs text-gray-400">
              Rekord: {streak.longest} Tage
            </p>
          )}
        </div>
      </div>

      {/* Week Progress */}
      <div className="mt-4 flex justify-between">
        {orderedDays.map((day, index) => {
          const dayIndex = index === 6 ? 0 : index + 1; // Convert to JS day (0=Sunday)
          const isToday = dayIndex === today;
          const isPast = dayIndex < today || (today === 0 && index < 6);
          const isActive = isPast || isToday; // Simplified - show as active if past or today
          
          return (
            <div key={day} className="flex flex-col items-center gap-1">
              <span className={`text-[10px] font-medium ${isToday ? 'text-orange-500' : 'text-gray-400'}`}>
                {day}
              </span>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                isToday 
                  ? 'bg-orange-500 text-white shadow-md shadow-orange-200' 
                  : isActive && streak.current > 0
                    ? 'bg-orange-100 text-orange-500'
                    : 'bg-gray-100 text-gray-300'
              }`}>
                {isActive && streak.current > 0 ? (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <span className="w-2 h-2 rounded-full bg-current opacity-30" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Expanded Details */}
      {showDetails && (
        <div className="mt-4 pt-4 border-t border-gray-100 animate-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-orange-500">{streak.current}</p>
              <p className="text-xs text-gray-500">Aktuelle Serie</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-500">{streak.longest}</p>
              <p className="text-xs text-gray-500">Längste Serie</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-teal-500">{streak.total}</p>
              <p className="text-xs text-gray-500">Tage gesamt</p>
            </div>
          </div>
          
          {/* Motivational hint */}
          <div className="mt-4 p-3 bg-orange-50 rounded-xl">
            <p className="text-xs text-orange-700 text-center">
              {streak.current === 0 
                ? '💡 Logge heute deine erste Mahlzeit um deine Serie zu starten!'
                : streak.current < 7
                  ? `💡 Noch ${7 - streak.current} Tage bis zu deinem ersten Meilenstein!`
                  : '🎯 Du bist auf einem großartigen Weg! Bleib dran!'
              }
            </p>
          </div>

          {!user && (
            <p className="text-xs text-gray-400 text-center mt-3">
              Melde dich an um deine Serie zu speichern
            </p>
          )}
        </div>
      )}
    </div>
  );
}
