'use client';

import { useState, useEffect } from 'react';

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  emoji: string;
  highlight?: string; // CSS selector to highlight (optional)
}

const tutorialSteps: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Willkommen! 👋',
    description: 'Lass mich dir kurz zeigen, wie die App funktioniert. Das dauert nur 30 Sekunden!',
    emoji: '🎉',
  },
  {
    id: 'calendar',
    title: 'Dein Kalender',
    description: 'Wische hier nach links oder rechts, um zwischen den Tagen zu wechseln. Du siehst 3 Wochen im Voraus.',
    emoji: '📅',
  },
  {
    id: 'meals',
    title: 'Deine Mahlzeiten',
    description: 'Wische durch deine Mahlzeiten: Frühstück, Snacks, Mittagessen und Abendessen. Jede Karte zeigt dir ein Rezept.',
    emoji: '🍽️',
  },
  {
    id: 'recipe',
    title: 'Rezept ansehen',
    description: 'Tippe auf den Rezept-Namen, um alle Details zu sehen: Zutaten, Zubereitung und Nährwerte.',
    emoji: '👆',
  },
  {
    id: 'swap',
    title: 'Rezept wechseln',
    description: 'Gefällt dir ein Rezept nicht? Tippe auf "Wechseln" und such dir ein anderes aus!',
    emoji: '🔄',
  },
  {
    id: 'eaten',
    title: 'Gegessen markieren',
    description: 'Hast du eine Mahlzeit gegessen? Tippe auf "Gegessen?" um deinen Fortschritt zu tracken.',
    emoji: '✅',
  },
  {
    id: 'water',
    title: 'Wasser tracken',
    description: 'Vergiss nicht zu trinken! Tippe auf "+1 Glas" oder "+½ Liter" um dein Wasserziel zu erreichen.',
    emoji: '💧',
  },
  {
    id: 'shopping',
    title: 'Einkaufsliste',
    description: 'Unten findest du "Einkaufen" – dort siehst du alle Zutaten für die Woche automatisch zusammengestellt.',
    emoji: '🛒',
  },
  {
    id: 'favorites',
    title: 'Favoriten speichern',
    description: 'Tippe auf das Herz ❤️ bei einem Rezept, um es als Favorit zu speichern.',
    emoji: '❤️',
  },
  {
    id: 'profile',
    title: 'Dein Profil',
    description: 'Unter "Ich" kannst du deine Daten anpassen oder das Onboarding wiederholen.',
    emoji: '👤',
  },
  {
    id: 'done',
    title: 'Das war\'s!',
    description: 'Du bist bereit! Bei Fragen findest du diese Anleitung jederzeit in deinem Profil.',
    emoji: '🚀',
  },
];

const TUTORIAL_SEEN_KEY = 'fitinn_tutorial_seen';

export function hasTutorialBeenSeen(): boolean {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem(TUTORIAL_SEEN_KEY) === 'true';
}

export function markTutorialAsSeen(): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(TUTORIAL_SEEN_KEY, 'true');
  }
}

export function resetTutorial(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TUTORIAL_SEEN_KEY);
  }
}

interface AppTutorialProps {
  onComplete: () => void;
}

export default function AppTutorial({ onComplete }: AppTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const step = tutorialSteps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === tutorialSteps.length - 1;
  const progress = ((currentStep + 1) / tutorialSteps.length) * 100;

  const handleNext = () => {
    if (isLastStep) {
      markTutorialAsSeen();
      setIsVisible(false);
      onComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleSkip = () => {
    markTutorialAsSeen();
    setIsVisible(false);
    onComplete();
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      
      {/* Tutorial Card */}
      <div className="relative w-full sm:max-w-md mx-4 mb-4 sm:mb-0 animate-slide-up">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Progress Bar */}
          <div className="h-1 bg-gray-100">
            <div 
              className="h-full bg-teal-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Content */}
          <div className="p-6 text-center">
            {/* Emoji */}
            <div className="text-6xl mb-4 animate-bounce-slow">
              {step.emoji}
            </div>
            
            {/* Title */}
            <h2 className="text-xl font-bold text-gray-900 mb-3">
              {step.title}
            </h2>
            
            {/* Description */}
            <p className="text-gray-600 text-base leading-relaxed mb-6">
              {step.description}
            </p>

            {/* Step Counter */}
            <p className="text-sm text-gray-400 mb-4">
              {currentStep + 1} von {tutorialSteps.length}
            </p>

            {/* Buttons */}
            <div className="flex gap-3">
              {!isFirstStep && (
                <button
                  onClick={handlePrev}
                  className="flex-1 py-4 rounded-xl bg-gray-100 text-gray-700 font-semibold active:scale-[0.98] transition-transform touch-manipulation"
                >
                  ← Zurück
                </button>
              )}
              
              {isFirstStep && (
                <button
                  onClick={handleSkip}
                  className="flex-1 py-4 rounded-xl bg-gray-100 text-gray-500 font-medium active:scale-[0.98] transition-transform touch-manipulation"
                >
                  Überspringen
                </button>
              )}
              
              <button
                onClick={handleNext}
                className="flex-1 py-4 rounded-xl bg-teal-600 text-white font-semibold active:scale-[0.98] transition-transform touch-manipulation shadow-lg shadow-teal-500/30"
              >
                {isLastStep ? 'Los geht\'s! 🚀' : 'Weiter →'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }
        @keyframes slide-up {
          from { transform: translateY(100px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
