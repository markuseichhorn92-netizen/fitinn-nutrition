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
}

const TUTORIAL_KEY = 'fitinn_tutorial_completed';

export function isTutorialCompleted(): boolean {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem(TUTORIAL_KEY) === 'true';
}

export function completeTutorial(): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(TUTORIAL_KEY, 'true');
  }
}

export function resetTutorialState(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TUTORIAL_KEY);
  }
}

interface InteractiveTutorialProps {
  steps: TutorialStep[];
  onComplete: () => void;
  onSkip: () => void;
}

export default function InteractiveTutorial({ steps, onComplete, onSkip }: InteractiveTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isVisible, setIsVisible] = useState(true);

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

  const handleNext = useCallback(() => {
    if (isLastStep) {
      completeTutorial();
      setIsVisible(false);
      onComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  }, [isLastStep, onComplete]);

  const handleSkip = useCallback(() => {
    completeTutorial();
    setIsVisible(false);
    onSkip();
  }, [onSkip]);

  // Listen for user interactions on target
  useEffect(() => {
    if (!step?.targetSelector || !step?.action) return;

    const element = document.querySelector(step.targetSelector);
    if (!element) return;

    const handleInteraction = () => {
      // User performed the action, go to next step
      setTimeout(handleNext, 500);
    };

    if (step.action === 'tap' || step.action === 'any') {
      element.addEventListener('click', handleInteraction);
      element.addEventListener('touchend', handleInteraction);
    }

    return () => {
      element.removeEventListener('click', handleInteraction);
      element.removeEventListener('touchend', handleInteraction);
    };
  }, [step, handleNext]);

  if (!isVisible) return null;

  const tooltipPosition = step?.position || 'bottom';
  const showSpotlight = targetRect && step?.targetSelector;

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none">
      {/* Dark overlay with cutout for target */}
      <svg className="absolute inset-0 w-full h-full pointer-events-auto" onClick={(e) => e.stopPropagation()}>
        <defs>
          <mask id="spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {showSpotlight && (
              <rect
                x={targetRect.left - 8}
                y={targetRect.top - 8}
                width={targetRect.width + 16}
                height={targetRect.height + 16}
                rx="16"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.75)"
          mask="url(#spotlight-mask)"
        />
      </svg>

      {/* Highlight ring around target */}
      {showSpotlight && (
        <div
          className="absolute border-4 border-teal-400 rounded-2xl pointer-events-none animate-pulse-ring"
          style={{
            left: targetRect.left - 8,
            top: targetRect.top - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16,
          }}
        />
      )}

      {/* Make target element clickable through overlay */}
      {showSpotlight && (
        <div
          className="absolute pointer-events-auto"
          style={{
            left: targetRect.left - 8,
            top: targetRect.top - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16,
          }}
        />
      )}

      {/* Tooltip */}
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
              <div className="bg-teal-50 rounded-xl px-4 py-2 mb-4 flex items-center gap-2">
                <span className="text-teal-600">
                  {step.action === 'tap' && '👆'}
                  {step.action === 'swipe' && '👈👉'}
                  {step.action === 'scroll' && '↕️'}
                </span>
                <span className="text-sm text-teal-700 font-medium">
                  {step.action === 'tap' && 'Tippe auf den markierten Bereich'}
                  {step.action === 'swipe' && 'Wische nach links oder rechts'}
                  {step.action === 'scroll' && 'Scrolle durch den Bereich'}
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
                  onClick={handleNext}
                  className="flex-1 py-3 rounded-xl bg-teal-600 text-white font-semibold text-sm shadow-lg shadow-teal-500/30 touch-manipulation active:scale-95 transition-transform"
                >
                  {isLastStep ? 'Fertig! 🎉' : 'Weiter →'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

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
      `}</style>
    </div>
  );
}
