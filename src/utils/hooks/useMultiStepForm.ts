import { useState, useCallback } from 'react';

export interface StepConfig {
  id: string;
  title: string;
  description?: string;
  isOptional?: boolean;
  canSkip?: boolean;
}

export interface UseMultiStepFormProps {
  steps: StepConfig[];
  initialStep?: number;
  onStepChange?: (currentStep: number, previousStep: number) => void;
  onComplete?: () => void;
}

export interface UseMultiStepFormReturn {
  // Current state
  currentStep: number;
  currentStepConfig: StepConfig;
  totalSteps: number;
  
  // Navigation methods
  next: () => void;
  previous: () => void;
  goToStep: (stepIndex: number) => void;
  reset: () => void;
  
  // Status checks
  isFirstStep: boolean;
  isLastStep: boolean;
  canGoNext: boolean;
  canGoPrevious: boolean;
  
  // Progress tracking
  progress: number;
  completedSteps: number[];
  
  // Step management
  markStepAsCompleted: (stepIndex: number) => void;
  isStepCompleted: (stepIndex: number) => boolean;
  isStepAccessible: (stepIndex: number) => boolean;
}

export const useMultiStepForm = ({
  steps,
  initialStep = 0,
  onStepChange,
  onComplete,
}: UseMultiStepFormProps): UseMultiStepFormReturn => {
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  // Validation
  if (!steps || steps.length === 0) {
    throw new Error('useMultiStepForm: steps array cannot be empty');
  }

  if (initialStep < 0 || initialStep >= steps.length) {
    throw new Error('useMultiStepForm: initialStep must be within steps range');
  }

  const totalSteps = steps.length;
  const currentStepConfig = steps[currentStep];
  
  // Status checks
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;
  const canGoPrevious = currentStep > 0;
  const canGoNext = currentStep < totalSteps - 1;
  
  // Progress calculation
  const progress = ((currentStep + 1) / totalSteps) * 100;

  // Step completion tracking
  const markStepAsCompleted = useCallback((stepIndex: number) => {
    if (stepIndex >= 0 && stepIndex < totalSteps) {
      setCompletedSteps(prev => 
        prev.includes(stepIndex) ? prev : [...prev, stepIndex]
      );
    }
  }, [totalSteps]);

  const isStepCompleted = useCallback((stepIndex: number) => {
    return completedSteps.includes(stepIndex);
  }, [completedSteps]);

  const isStepAccessible = useCallback((stepIndex: number) => {
    // First step is always accessible
    if (stepIndex === 0) return true;
    
    // Can access if previous step is completed or current step
    return stepIndex <= currentStep || isStepCompleted(stepIndex - 1);
  }, [currentStep, isStepCompleted]);

  // Navigation methods
  const goToStep = useCallback((stepIndex: number) => {
    if (stepIndex >= 0 && stepIndex < totalSteps && isStepAccessible(stepIndex)) {
      const previousStep = currentStep;
      setCurrentStep(stepIndex);
      onStepChange?.(stepIndex, previousStep);
    }
  }, [currentStep, totalSteps, isStepAccessible, onStepChange]);

  const next = useCallback(() => {
    if (canGoNext) {
      // Mark current step as completed when moving forward
      markStepAsCompleted(currentStep);
      
      if (isLastStep) {
        onComplete?.();
      } else {
        goToStep(currentStep + 1);
      }
    }
  }, [canGoNext, currentStep, isLastStep, goToStep, markStepAsCompleted, onComplete]);

  const previous = useCallback(() => {
    if (canGoPrevious) {
      goToStep(currentStep - 1);
    }
  }, [canGoPrevious, currentStep, goToStep]);

  const reset = useCallback(() => {
    setCurrentStep(initialStep);
    setCompletedSteps([]);
  }, [initialStep]);

  return {
    // Current state
    currentStep,
    currentStepConfig,
    totalSteps,
    
    // Navigation methods
    next,
    previous,
    goToStep,
    reset,
    
    // Status checks
    isFirstStep,
    isLastStep,
    canGoNext,
    canGoPrevious,
    
    // Progress tracking
    progress,
    completedSteps,
    
    // Step management
    markStepAsCompleted,
    isStepCompleted,
    isStepAccessible,
  };
};
