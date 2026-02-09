'use client';

import { useState, useEffect } from 'react';
import InteractiveTutorial, { TutorialStep, isTutorialCompleted, resetTutorialState } from './InteractiveTutorial';

// Re-export for profile page
export { resetTutorialState, isTutorialCompleted };

const tutorialSteps: TutorialStep[] = [
  {
    id: 'welcome',
    emoji: '👋',
    title: 'Willkommen zu deinem Ernährungsplan!',
    description: 'In 30 Sekunden zeige ich dir, wie alles funktioniert.',
    position: 'center',
  },
  {
    id: 'calendar',
    emoji: '📅',
    title: 'Dein Kalender',
    description: 'Wische hier durch die Tage. Du siehst 3 Wochen im Voraus!',
    targetSelector: '[data-tutorial="calendar"]',
    action: 'swipe',
    position: 'bottom',
  },
  {
    id: 'meal-cards',
    emoji: '🍽️',
    title: 'Deine Mahlzeiten',
    description: 'Jede Karte ist eine Mahlzeit. Wische durch um alle zu sehen!',
    targetSelector: '[data-tutorial="meals"]',
    action: 'swipe',
    position: 'top',
  },
  {
    id: 'meal-type',
    emoji: '🌅',
    title: 'Mahlzeit erkennen',
    description: 'Oben siehst du immer welche Mahlzeit es ist: Frühstück, Mittag, Abend...',
    targetSelector: '[data-tutorial="meal-header"]',
    position: 'bottom',
  },
  {
    id: 'recipe-tap',
    emoji: '👆',
    title: 'Rezept ansehen',
    description: 'Tippe auf den Rezept-Namen um Zutaten und Zubereitung zu sehen. (Probier es später aus!)',
    targetSelector: '[data-tutorial="recipe-name"]',
    position: 'bottom',
    // No action - just show, don't require tap (would navigate away)
  },
  {
    id: 'swap-button',
    emoji: '🔄',
    title: 'Rezept wechseln',
    description: 'Nicht dein Geschmack? Tippe hier für Alternativen!',
    targetSelector: '[data-tutorial="swap-btn"]',
    action: 'tap',
    position: 'top',
  },
  {
    id: 'eaten-button',
    emoji: '✅',
    title: 'Gegessen markieren',
    description: 'Hast du gegessen? Tippe hier um es zu tracken!',
    targetSelector: '[data-tutorial="eaten-btn"]',
    action: 'tap',
    position: 'top',
  },
  {
    id: 'water',
    emoji: '💧',
    title: 'Wasser tracken',
    description: 'Vergiss nicht zu trinken! Tippe auf ein Glas.',
    targetSelector: '[data-tutorial="water"]',
    action: 'tap',
    position: 'top',
  },
  {
    id: 'nav-shopping',
    emoji: '🛒',
    title: 'Einkaufsliste',
    description: 'Hier findest du alle Zutaten für die Woche!',
    targetSelector: '[data-tutorial="nav-shopping"]',
    action: 'tap',
    position: 'top',
  },
  {
    id: 'done',
    emoji: '🎉',
    title: 'Perfekt!',
    description: 'Du weißt jetzt alles! Diese Anleitung findest du jederzeit im Profil.',
    position: 'center',
  },
];

interface PlanTutorialProps {
  onComplete: () => void;
}

export default function PlanTutorial({ onComplete }: PlanTutorialProps) {
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    // Check if tutorial should be shown
    if (!isTutorialCompleted()) {
      // Small delay to let page render
      const timer = setTimeout(() => setShowTutorial(true), 500);
      return () => clearTimeout(timer);
    }
  }, []);

  if (!showTutorial) return null;

  return (
    <InteractiveTutorial
      steps={tutorialSteps}
      onComplete={() => {
        setShowTutorial(false);
        onComplete();
      }}
      onSkip={() => {
        setShowTutorial(false);
        onComplete();
      }}
    />
  );
}
