'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { OnboardingLayout, QuizOption, OnboardingCTA } from '@/components/onboarding/OnboardingLayout';
import { useGuestSession } from '@/hooks/useGuestSession';
import type { ActivityLevel } from '@/types';

const ACTIVITY_OPTIONS: { value: ActivityLevel; emoji: string; label: string; description: string }[] = [
  { 
    value: 'sedentary', 
    emoji: '🛋️', 
    label: 'Sedentary', 
    description: 'Little or no exercise, desk job' 
  },
  { 
    value: 'lightly_active', 
    emoji: '🚶', 
    label: 'Lightly Active', 
    description: 'Light exercise 1-3 days per week' 
  },
  { 
    value: 'moderately_active', 
    emoji: '🏃', 
    label: 'Moderately Active', 
    description: 'Moderate exercise 3-5 days per week' 
  },
  { 
    value: 'very_active', 
    emoji: '💪', 
    label: 'Very Active', 
    description: 'Hard exercise 6-7 days per week' 
  },
  { 
    value: 'extra_active', 
    emoji: '🏋️', 
    label: 'Extra Active', 
    description: 'Very hard exercise + physical job' 
  },
];

/**
 * Guest Activity Level Page
 * Second step: collects user's activity level for TDEE calculations
 */
export default function ActivityLevelPage() {
  const router = useRouter();
  const { saveData, data, isLoading } = useGuestSession();
  const [selected, setSelected] = useState<ActivityLevel | null>(data.activityLevel || null);
  const [isNavigating, setIsNavigating] = useState(false);

  // Load saved data when available
  useEffect(() => {
    if (data.activityLevel) {
      setSelected(data.activityLevel);
    }
  }, [data.activityLevel]);

  const handleContinue = async (value?: ActivityLevel) => {
    const selectedValue = value || selected;
    if (!selectedValue) return;
    
    setIsNavigating(true);
    
    await saveData({ 
      activityLevel: selectedValue,
      currentStep: 'weight_goal',
    });
    
    router.push('/start/weight-goal');
  };

  // Auto-advance when an option is selected
  const handleOptionClick = (value: ActivityLevel) => {
    setSelected(value);
    setTimeout(() => {
      handleContinue(value);
    }, 300);
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-app-bg flex flex-col items-center justify-center">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-2 border-[#e1ddd8]" />
          <div className="absolute inset-0 w-12 h-12 rounded-full border-2 border-transparent border-t-[#a07855] animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <OnboardingLayout 
      showProgress 
      currentStep={2} 
      totalSteps={3}
      stepLabel="Step 2 of 3"
    >
      {/* Content */}
      <motion.div 
        className="flex-1 flex flex-col items-center justify-start px-4 py-8 lg:py-12"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="w-full max-w-xl lg:max-w-2xl mx-auto">
          {/* Header */}
          <h1 className="font-albert text-[32px] lg:text-[42px] text-text-primary tracking-[-2px] leading-[1.2] mb-4">
            How active are you?
          </h1>
          <p className="font-sans text-[16px] text-text-secondary mb-8">
            This helps us calculate your daily calorie needs.
          </p>

          {/* Options */}
          <div className="space-y-3 mb-8">
            {ACTIVITY_OPTIONS.map((option) => (
              <QuizOption
                key={option.value}
                selected={selected === option.value}
                disabled={isNavigating}
                onClick={() => handleOptionClick(option.value)}
              >
                <div className="flex items-start gap-4">
                  <span className="text-[28px]">{option.emoji}</span>
                  <div>
                    <p className="font-albert text-[18px] font-semibold text-text-primary tracking-[-0.5px]">
                      {option.label}
                    </p>
                    <p className="font-sans text-[14px] text-text-secondary mt-0.5">
                      {option.description}
                    </p>
                  </div>
                </div>
              </QuizOption>
            ))}
          </div>

          {/* Tip */}
          <div className="p-4 bg-[#faf8f6] border border-[#e1ddd8] rounded-xl">
            <p className="font-sans text-[13px] text-text-muted leading-[1.5]">
              💡 <strong>Tip:</strong> Be honest about your activity level. Most people overestimate how active they are. When in doubt, choose one level lower.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Bottom CTA */}
      <OnboardingCTA onClick={() => handleContinue()} disabled={!selected || isNavigating}>
        {isNavigating ? 'Saving...' : 'Continue'}
      </OnboardingCTA>
    </OnboardingLayout>
  );
}

