'use client';

import { useMemo } from 'react';

interface CalorieRingDashboardProps {
  consumed: number;
  burned?: number;
  goal: number;
  protein: number;
  proteinGoal: number;
  carbs: number;
  carbsGoal: number;
  fat: number;
  fatGoal: number;
}

// SVG Circle Progress Ring
function ProgressRing({
  progress,
  size = 160,
  strokeWidth = 12,
  color = '#f97316', // FIT-INN Orange
  bgColor = '#f3f4f6',
  children,
}: {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  bgColor?: string;
  children?: React.ReactNode;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (Math.min(progress, 100) / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={bgColor}
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {children}
      </div>
    </div>
  );
}

// Small macro progress bar
function MacroBar({
  label,
  current,
  goal,
  color,
  unit = 'g',
}: {
  label: string;
  current: number;
  goal: number;
  color: string;
  unit?: string;
}) {
  const percentage = Math.min((current / goal) * 100, 100);
  const isOver = current > goal;

  return (
    <div className="flex-1">
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-xs font-medium text-gray-600">{label}</span>
        <span className={`text-xs font-bold ${isOver ? 'text-red-500' : 'text-gray-800'}`}>
          {Math.round(current)}{unit}
        </span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${isOver ? 'bg-red-400' : ''}`}
          style={{ 
            width: `${Math.min(percentage, 100)}%`,
            backgroundColor: isOver ? undefined : color,
          }}
        />
      </div>
      <span className="text-[10px] text-gray-400">{Math.round(goal)}{unit}</span>
    </div>
  );
}

export default function CalorieRingDashboard({
  consumed,
  burned = 0,
  goal,
  protein,
  proteinGoal,
  carbs,
  carbsGoal,
  fat,
  fatGoal,
}: CalorieRingDashboardProps) {
  const remaining = Math.max(goal - consumed + burned, 0);
  const progress = (consumed / goal) * 100;
  const isOver = consumed > goal;

  // Dynamic ring color based on progress
  const ringColor = useMemo(() => {
    if (isOver) return '#ef4444'; // Red when over
    if (progress >= 90) return '#22c55e'; // Green when almost done
    return '#f97316'; // FIT-INN Orange
  }, [progress, isOver]);

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-900 text-lg">Heute</h3>
        <span className="text-xs text-gray-400 font-medium">
          Woche {Math.ceil((new Date().getDate()) / 7)}
        </span>
      </div>

      {/* Main Ring + Stats */}
      <div className="flex items-center gap-6 mb-6">
        {/* Calorie Ring */}
        <ProgressRing
          progress={progress}
          size={140}
          strokeWidth={14}
          color={ringColor}
        >
          <span className="text-3xl font-bold text-gray-900">{remaining}</span>
          <span className="text-xs text-gray-500 font-medium">Übrig</span>
        </ProgressRing>

        {/* Stats Column */}
        <div className="flex-1 space-y-3">
          {/* Consumed */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
              <span className="text-sm">🍽️</span>
            </div>
            <div>
              <p className="text-xs text-gray-500">Gegessen</p>
              <p className="text-lg font-bold text-gray-900">{consumed}</p>
            </div>
          </div>

          {/* Burned (if available) */}
          {burned > 0 && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                <span className="text-sm">🔥</span>
              </div>
              <div>
                <p className="text-xs text-gray-500">Verbrannt</p>
                <p className="text-lg font-bold text-green-600">+{burned}</p>
              </div>
            </div>
          )}

          {/* Goal */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
              <span className="text-sm">🎯</span>
            </div>
            <div>
              <p className="text-xs text-gray-500">Ziel</p>
              <p className="text-lg font-bold text-gray-600">{goal}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Macro Bars */}
      <div className="flex gap-4">
        <MacroBar
          label="Kohlenhydrate"
          current={carbs}
          goal={carbsGoal}
          color="#eab308" // Yellow
        />
        <MacroBar
          label="Eiweiß"
          current={protein}
          goal={proteinGoal}
          color="#ef4444" // Red
        />
        <MacroBar
          label="Fett"
          current={fat}
          goal={fatGoal}
          color="#3b82f6" // Blue
        />
      </div>

      {/* Progress message */}
      {isOver && (
        <p className="text-center text-sm text-red-500 font-medium mt-4">
          ⚠️ {consumed - goal} kcal über dem Ziel
        </p>
      )}
      {!isOver && progress >= 90 && (
        <p className="text-center text-sm text-green-600 font-medium mt-4">
          🎉 Fast geschafft! Noch {remaining} kcal
        </p>
      )}
    </div>
  );
}
