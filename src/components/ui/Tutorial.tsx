import { useTranslation } from 'react-i18next';
// Per-effect eslint suppressions used instead of whole-file disable
import { useEffect, useState, useCallback, useRef } from 'react';
import { X } from 'lucide-react';
import { useUiStore } from "@/store/uiStore";
import DOMPurify from 'dompurify';

interface TutorialStep {
  target: string; // CSS selector
  content: string;
  placement: 'top' | 'bottom' | 'left' | 'right' | 'center';
  onEnter?: () => void;  // Called when entering this step
  onLeave?: () => void;  // Called when leaving this step
}

/**
 * Draws a triangular arrow pointing at the target element.
 * Uses CSS variable --surface-nav for theme-aware coloring.
 */
function ArrowIndicator({ placement }: { placement: TutorialStep['placement'] }) {
  if (placement === 'center') return null;

  // Arrow position and rotation depend on placement:
  // placement=right  → arrow on the left side of the tooltip, pointing left
  // placement=left   → arrow on the right side of the tooltip, pointing right
  // placement=bottom → arrow on the top of the tooltip, pointing up
  // placement=top    → arrow on the bottom of the tooltip, pointing down

  const shared = 'absolute w-0 h-0';
  const arrowColor = 'hsl(var(--surface-nav))';

  switch (placement) {
    case 'right':
      return (
        <div
          className={shared}
          style={{
            left: -10,
            top: '50%',
            marginTop: -8,
            borderTop: '8px solid transparent',
            borderBottom: '8px solid transparent',
            borderRight: `10px solid ${arrowColor}`,
          }}
        />
      );
    case 'left':
      return (
        <div
          className={shared}
          style={{
            right: -10,
            top: '50%',
            marginTop: -8,
            borderTop: '8px solid transparent',
            borderBottom: '8px solid transparent',
            borderLeft: `10px solid ${arrowColor}`,
          }}
        />
      );
    case 'bottom':
      return (
        <div
          className={shared}
          style={{
            top: -10,
            left: '50%',
            marginLeft: -8,
            borderLeft: '8px solid transparent',
            borderRight: '8px solid transparent',
            borderBottom: `10px solid ${arrowColor}`,
          }}
        />
      );
    case 'top':
      return (
        <div
          className={shared}
          style={{
            bottom: -10,
            left: '50%',
            marginLeft: -8,
            borderLeft: '8px solid transparent',
            borderRight: '8px solid transparent',
            borderTop: `10px solid ${arrowColor}`,
          }}
        />
      );
    default:
      return null;
  }
}

/**
 * Oblicza pozycję dymka względem elementu docelowego.
 */
function computeTooltipPosition(
  targetRect: DOMRect | null,
  placement: TutorialStep['placement'],
  tooltipW = 340,
  tooltipH = 220,
  gap = 16
): { top: number; left: number } {
  if (!targetRect || placement === 'center') {
    return {
      top: window.innerHeight / 2 - tooltipH / 2,
      left: window.innerWidth / 2 - tooltipW / 2,
    };
  }

  const cx = targetRect.left + targetRect.width / 2;
  const cy = targetRect.top + targetRect.height / 2;

  let top = 0;
  let left = 0;

  switch (placement) {
    case 'right':
      top = cy - tooltipH / 2;
      left = targetRect.right + gap;
      break;
    case 'left':
      top = cy - tooltipH / 2;
      left = targetRect.left - tooltipW - gap;
      break;
    case 'bottom':
      top = targetRect.bottom + gap;
      left = cx - tooltipW / 2;
      break;
    case 'top':
      top = targetRect.top - tooltipH - gap;
      left = cx - tooltipW / 2;
      break;
  }

  // Clamp to viewport
  top = Math.max(12, Math.min(top, window.innerHeight - tooltipH - 12));
  left = Math.max(12, Math.min(left, window.innerWidth - tooltipW - 12));

  return { top, left };
}

export const Tutorial = () => {
  const { t } = useTranslation();
  const isTutorialActive = useUiStore(state => state.isTutorialActive);
  const setTutorialActive = useUiStore(state => state.setTutorialActive);
  const setRadialMenuConfig = useUiStore(state => state.setRadialMenuConfig);

  const [currentStep, setCurrentStep] = useState(0);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // --- Step Definitions ---
  const steps: TutorialStep[] = [
    {
      target: 'body',
      content: t('tutorial.step1'),
      placement: 'center',
    },
    {
      target: '.tour-nav-bar',
      content: t('tutorial.step2'),
      placement: 'right',
    },
    {
      target: '.tour-save-bar',
      content: t('tutorial.step3'),
      placement: 'bottom',
    },
    {
      target: '.react-flow',
      content: t('tutorial.step4'),
      placement: 'center',
    },
    {
      target: '.tour-radial-menu',
      content: t('tutorial.step5'),
      placement: 'right',
      onEnter: () => {
        // Programmatically open the radial menu in the center of the canvas
        const canvas = document.querySelector('.react-flow');
        if (canvas) {
          const rect = canvas.getBoundingClientRect();
          setRadialMenuConfig({
            isOpen: true,
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
            contextNodeId: null,
          });
        }
      },
      onLeave: () => {
        // Zamykamy menu radialne
        setRadialMenuConfig({
          isOpen: false,
          x: 0,
          y: 0,
          contextNodeId: null,
        });
      },
    },
    {
      target: '.tour-properties-panel',
      content: t('tutorial.step6'),
      placement: 'left',
    },
    {
      target: '.tour-linter',
      content: t('tutorial.step7'),
      placement: 'right',
    },
    {
      target: '.tour-bottom-controls',
      content: t('tutorial.step8'),
      placement: 'left',
    },
  ];

  const TOTAL_STEPS = steps.length;

  // Auto-start for new users
  useEffect(() => {
    const isCompleted = localStorage.getItem('gryf-tutorial-completed');
    if (!isCompleted && !isTutorialActive) {
      setTutorialActive(true);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Calculate tooltip position on step or window resize
  const updatePosition = useCallback(() => {
    if (!isTutorialActive) return;
    const step = steps[currentStep];
    if (!step) return;

    let rect: DOMRect | null = null;
    if (step.target !== 'body' && step.placement !== 'center') {
      const el = document.querySelector(step.target);
      if (el) {
        rect = el.getBoundingClientRect();
      }
    }
    setTargetRect(rect);

    const tooltipH = tooltipRef.current?.offsetHeight || 220;
    const pos = computeTooltipPosition(rect, step.placement, 340, tooltipH);
    setTooltipPos(pos);
  }, [isTutorialActive, currentStep]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const timer0 = setTimeout(() => updatePosition(), 0);
    // Small delay for the second render, when tooltipRef has measured height or target is rendered
    const timer1 = setTimeout(updatePosition, 50);
    const timer2 = setTimeout(updatePosition, 200);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      clearTimeout(timer0);
      clearTimeout(timer1);
      clearTimeout(timer2);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [updatePosition]);

  // Reset step when tutorial restarts
  useEffect(() => {
    if (isTutorialActive) {
      const timer = setTimeout(() => setCurrentStep(0), 0);
      return () => clearTimeout(timer);
    }
  }, [isTutorialActive]);

  // Trigger onEnter/onLeave on step change
  useEffect(() => {
    if (!isTutorialActive) return;
    const step = steps[currentStep];
    step?.onEnter?.();

    return () => {
      step?.onLeave?.();
    };
  }, [currentStep, isTutorialActive]); // eslint-disable-line react-hooks/exhaustive-deps

  const closeTutorial = useCallback(() => {
    // First trigger onLeave for current step
    const step = steps[currentStep];
    step?.onLeave?.();
    setTutorialActive(false);
    localStorage.setItem('gryf-tutorial-completed', 'true');
  }, [setTutorialActive, currentStep]); // eslint-disable-line react-hooks/exhaustive-deps

  const goNext = useCallback(() => {
    if (currentStep >= TOTAL_STEPS - 1) {
      closeTutorial();
    } else {
      const prevStep = steps[currentStep];
      prevStep?.onLeave?.();
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep, closeTutorial]); // eslint-disable-line react-hooks/exhaustive-deps

  const goBack = useCallback(() => {
    if (currentStep > 0) {
      const prevStep = steps[currentStep];
      prevStep?.onLeave?.();
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleOverlayClick = useCallback(() => {
    closeTutorial();
  }, [closeTutorial]);

  if (!isTutorialActive) return null;

  const step = steps[currentStep];
  const isLastStep = currentStep === TOTAL_STEPS - 1;
  const isCenter = step.placement === 'center' || step.target === 'body';

  return (
    <>
      {/* Ciemny overlay */}
      <div
        className="fixed inset-0 z-[9998]"
        onClick={handleOverlayClick}
        style={{ background: 'rgba(0,0,0,0.55)' }}
      />

      {/* Spotlight on target element */}
      {targetRect && !isCenter && (
        <div
          className="fixed z-[9999] pointer-events-none rounded-2xl"
          style={{
            top: targetRect.top - 8,
            left: targetRect.left - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16,
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)',
            background: 'transparent',
          }}
        />
      )}

      {/* Tooltip with arrow */}
      <div
        ref={tooltipRef}
        className="fixed z-[10000] w-[340px]"
        style={{
          top: tooltipPos.top,
          left: tooltipPos.left,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Arrow pointing to the element */}
        <ArrowIndicator placement={step.placement} />

        {/* Tooltip content */}
        <div className="bg-surface-nav border border-border rounded-[24px] p-6 text-foreground shadow-2xl relative">
          {/* X zamknij */}
          <button
            onClick={closeTutorial}
            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
            aria-label={t('common.close')}
          >
            <X size={18} />
          </button>

          {/* Header with pulsating dot and counter */}
          <div className="flex items-center justify-between mb-2 pr-6">
            <div className="flex items-center gap-2">
              {/* Pulsating gold dot */}
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-gold opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-brand-gold" />
              </span>
            </div>
            <span className="text-xs font-medium text-muted-foreground bg-white/5 px-2 py-1 rounded-md">
              {currentStep + 1} / {TOTAL_STEPS}
            </span>
          </div>

          {/* Content */}
          <div 
            className="text-sm text-muted-foreground leading-relaxed mb-6 mt-2"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(step.content) }}
          />

          {/* Przyciski nawigacji */}
          <div className="flex justify-between items-center mt-6">
            <button
              onClick={closeTutorial}
              className="text-xs font-medium text-muted-foreground hover:text-muted-foreground transition-colors"
            >
              {t('tutorial.finish')}
            </button>
            <div className="flex gap-2">
              {currentStep > 0 && (
                <button
                  onClick={goBack}
                  className="px-4 py-2 text-xs font-bold text-brand-gold bg-brand-gold/10 rounded-full hover:bg-brand-gold/20 transition-colors"
                >
                  {t('tutorial.back')}
                </button>
              )}
              <button
                onClick={goNext}
                className="px-4 py-2 text-xs font-bold text-black bg-brand-gold rounded-full hover:bg-brand-gold/90 transition-colors"
              >
                {isLastStep ? t('tutorial.finish') : t('tutorial.next')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
