'use client';

import { useState, useEffect, useCallback } from 'react';

export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  emoji: string;
  targetSelector?: string; // CSS selector for element to highlight
  action?: 'tap' | 'swipe' | 'scroll' | 'any'; // What user needs to do
  position?: 'top' | 'bottom' | 'center'; // Where to show tooltip
  onEnter?: () => void; // Called when step starts
  preventNavigation?: boolean; // Prevent link clicks from navigating
}

const TUTORIAL_KEY = 'fitinn_tutorial_completed';
const TUTORIAL_STEP_KEY = 'fitinn_tutorial_step';

export function isTutorialCompleted(): boolean {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem(TUTORIAL_KEY) === 'true';
}

export function completeTutorial(): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(TUTORIAL_KEY, 'true');
    localStorage.removeItem(TUTORIAL_STEP_KEY);
  }
}

export function resetTutorialState(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TUTORIAL_KEY);
    localStorage.removeItem(TUTORIAL_STEP_KEY);
  }
}

// Save/load current step for cross-page persistence
export function saveTutorialStep(step: number): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(TUTORIAL_STEP_KEY, String(step));
  }
}

export function loadTutorialStep(): number {
  if (typeof window === 'undefined') return 0;
  const saved = localStorage.getItem(TUTORIAL_STEP_KEY);
  return saved ? parseInt(saved, 10) : 0;
}

// Success messages to show after completing an action
const successMessages = [
  { text: 'Super!', emoji: '✨' },
  { text: 'Perfekt!', emoji: '👏' },
  { text: 'Genau so!', emoji: '💪' },
  { text: 'Richtig!', emoji: '✅' },
  { text: 'Klasse!', emoji: '🌟' },
];

interface InteractiveTutorialProps {
  steps: TutorialStep[];
  onComplete: () => void;
  onSkip: () => void;
}

export default function InteractiveTutorial({ steps, onComplete, onSkip }: InteractiveTutorialProps) {
  const [currentStep, setCurrentStep] = useState(() => loadTutorialStep());
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState(successMessages[0]);

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  // Find and highlight target element
  useEffect(() => {
    if (!step?.targetSelector) {
      setTargetRect(null);
      return;
    }

    const findTarget = () => {
      const element = document.querySelector(step.targetSelector!);
      if (element) {
        const rect = element.getBoundingClientRect();
        setTargetRect(rect);
        
        // Scroll element into view if needed
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Call onEnter callback
        step.onEnter?.();
      }
    };

    // Small delay to let page render
    const timer = setTimeout(findTarget, 300);
    
    // Also listen for resize/scroll
    window.addEventListener('resize', findTarget);
    window.addEventListener('scroll', findTarget, true);
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', findTarget);
      window.removeEventListener('scroll', findTarget, true);
    };
  }, [step]);

  const goToNextStep = useCallback(() => {
    if (isLastStep) {
      completeTutorial();
      setIsVisible(false);
      onComplete();
    } else {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      saveTutorialStep(nextStep);
      setShowSuccess(false);
    }
  }, [isLastStep, currentStep, onComplete]);

  const handleActionComplete = useCallback(() => {
    // Show success message
    const randomSuccess = successMessages[Math.floor(Math.random() * successMessages.length)];
    setSuccessMessage(randomSuccess);
    setShowSuccess(true);
    
    // Wait 1.5 seconds before going to next step
    setTimeout(goToNextStep, 1500);
  }, [goToNextStep]);

  const handleSkip = useCallback(() => {
    completeTutorial();
    setIsVisible(false);
    onSkip();
  }, [onSkip]);

  // Listen for user interactions on target
  useEffect(() => {
    if (!step?.targetSelector || !step?.action || showSuccess) return;

    const element = document.querySelector(step.targetSelector);
    if (!element) return;

    let hasInteracted = false;
    
    const handleInteraction = (e: Event) => {
      if (hasInteracted) return;
      hasInteracted = true;
      
      // Prevent navigation if specified
      if (step.preventNavigation) {
        e.preventDefault();
        e.stopPropagation();
      }
      
      // Show success and go to next step after delay
      handleActionComplete();
    };

    if (step.action === 'tap' || step.action === 'any') {
      element.addEventListener('click', handleInteraction, { capture: true });
      element.addEventListener('touchend', handleInteraction, { capture: true });
    }
    
    // For swipe actions, detect scroll
    if (step.action === 'swipe' || step.action === 'scroll') {
      let startX = 0;
      const handleTouchStart = (e: TouchEvent) => {
        startX = e.touches[0].clientX;
      };
      const handleTouchEnd = (e: TouchEvent) => {
        const endX = e.changedTouches[0].clientX;
        if (Math.abs(endX - startX) > 30) {
          handleInteraction(e);
        }
      };
      const handleScroll = (e: Event) => {
        handleInteraction(e);
      };
      
      element.addEventListener('touchstart', handleTouchStart as EventListener);
      element.addEventListener('touchend', handleTouchEnd as EventListener);
      element.addEventListener('scroll', handleScroll);
      
      return () => {
        element.removeEventListener('click', handleInteraction, { capture: true });
        element.removeEventListener('touchend', handleInteraction as EventListener, { capture: true });
        element.removeEventListener('touchstart', handleTouchStart as EventListener);
        element.removeEventListener('scroll', handleScroll);
      };
    }

    return () => {
      element.removeEventListener('click', handleInteraction, { capture: true });
      element.removeEventListener('touchend', handleInteraction, { capture: true });
    };
  }, [step, handleActionComplete, showSuccess]);

  if (!isVisible) return null;

  const tooltipPosition = step?.position || 'bottom';
  const showSpotlight = targetRect && step?.targetSelector;

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none">
      {/* Dark overlay - 4 rectangles around the spotlight area */}
      {showSpotlight ? (
        <>
          {/* Top */}
          <div 
            className="absolute bg-black/75 left-0 right-0 top-0 pointer-events-auto"
            style={{ height: Math.max(0, targetRect.top - 12) }}
          />
          {/* Bottom */}
          <div 
            className="absolute bg-black/75 left-0 right-0 bottom-0 pointer-events-auto"
            style={{ top: targetRect.bottom + 12 }}
          />
          {/* Left */}
          <div 
            className="absolute bg-black/75 left-0 pointer-events-auto"
            style={{ 
              top: targetRect.top - 12,
              height: targetRect.height + 24,
              width: Math.max(0, targetRect.left - 12)
            }}
          />
          {/* Right */}
          <div 
            className="absolute bg-black/75 right-0 pointer-events-auto"
            style={{ 
              top: targetRect.top - 12,
              height: targetRect.height + 24,
              left: targetRect.right + 12
            }}
          />
        </>
      ) : (
        <div className="absolute inset-0 bg-black/75 pointer-events-auto" />
      )}

      {/* Highlight ring around target */}
      {showSpotlight && (
        <div
          className={`absolute border-4 rounded-2xl pointer-events-none ${
            showSuccess ? 'border-green-400 bg-green-400/20' : 'border-teal-400 animate-pulse-ring'
          }`}
          style={{
            left: targetRect.left - 12,
            top: targetRect.top - 12,
            width: targetRect.width + 24,
            height: targetRect.height + 24,
            transition: 'all 0.3s ease',
          }}
        />
      )}

      {/* Success Overlay */}
      {showSuccess && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="bg-white rounded-3xl shadow-2xl px-8 py-6 text-center animate-bounce-in">
            <span className="text-5xl block mb-2">{successMessage.emoji}</span>
            <span className="text-2xl font-bold text-gray-900">{successMessage.text}</span>
          </div>
        </div>
      )}

      {/* Tooltip */}
      {!showSuccess && (
        <div 
          className={`absolute left-4 right-4 pointer-events-auto ${
            tooltipPosition === 'top' ? 'top-20' :
            tooltipPosition === 'center' ? 'top-1/2 -translate-y-1/2' :
            showSpotlight ? '' : 'bottom-24'
          }`}
          style={showSpotlight && tooltipPosition === 'bottom' ? {
            top: Math.min(targetRect.bottom + 24, window.innerHeight - 200),
          } : showSpotlight && tooltipPosition === 'top' ? {
            top: Math.max(targetRect.top - 180, 80),
          } : {}}
        >
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden mx-auto max-w-sm">
            {/* Progress */}
            <div className="h-1 bg-gray-100">
              <div 
                className="h-full bg-teal-500 transition-all duration-300"
                style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
              />
            </div>

            <div className="p-5">
              {/* Step indicator */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-4xl">{step.emoji}</span>
                <span className="text-sm text-gray-400">{currentStep + 1}/{steps.length}</span>
              </div>

              {/* Content */}
              <h3 className="text-lg font-bold text-gray-900 mb-2">{step.title}</h3>
              <p className="text-gray-600 text-sm mb-4">{step.description}</p>

              {/* Action hint */}
              {step.action && step.action !== 'any' && (
                <div className="bg-teal-50 rounded-xl px-4 py-3 mb-4 flex items-center gap-3">
                  <span className="text-2xl">
                    {step.action === 'tap' && '👆'}
                    {step.action === 'swipe' && '👈👉'}
                    {step.action === 'scroll' && '↕️'}
                  </span>
                  <span className="text-sm text-teal-700 font-medium">
                    {step.action === 'tap' && 'Tippe jetzt auf den markierten Bereich'}
                    {step.action === 'swipe' && 'Wische jetzt nach links oder rechts'}
                    {step.action === 'scroll' && 'Scrolle jetzt durch den Bereich'}
                  </span>
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleSkip}
                  className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-600 font-medium text-sm touch-manipulation active:scale-95 transition-transform"
                >
                  Überspringen
                </button>
                {!step.action && (
                  <button
                    onClick={goToNextStep}
                    className="flex-1 py-3 rounded-xl bg-teal-600 text-white font-semibold text-sm shadow-lg shadow-teal-500/30 touch-manipulation active:scale-95 transition-transform"
                  >
                    {isLastStep ? 'Fertig! 🎉' : 'Weiter →'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes pulse-ring {
          0%, 100% { 
            box-shadow: 0 0 0 0 rgba(45, 212, 191, 0.7);
          }
          50% { 
            box-shadow: 0 0 0 12px rgba(45, 212, 191, 0);
          }
        }
        .animate-pulse-ring {
          animation: pulse-ring 1.5s ease-in-out infinite;
        }
        @keyframes bounce-in {
          0% { transform: scale(0.5); opacity: 0; }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-bounce-in {
          animation: bounce-in 0.4s ease-out;
        }
      `}</style>
    </div>
  );
}
