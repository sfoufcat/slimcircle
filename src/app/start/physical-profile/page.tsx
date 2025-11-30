'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { OnboardingLayout, OnboardingCTA } from '@/components/onboarding/OnboardingLayout';
import { useGuestSession } from '@/hooks/useGuestSession';
import type { Sex } from '@/types';

/**
 * Guest Physical Profile Page
 * Collects user's age, sex, height, and weight for calorie calculations
 */
export default function PhysicalProfilePage() {
  const router = useRouter();
  const { saveData, data, isLoading } = useGuestSession();
  const [isNavigating, setIsNavigating] = useState(false);
  
  // Form state
  const [age, setAge] = useState<string>(data.age?.toString() || '');
  const [sex, setSex] = useState<Sex | ''>(data.sex || '');
  const [heightCm, setHeightCm] = useState<string>(data.heightCm?.toString() || '');
  const [weightKg, setWeightKg] = useState<string>(data.weightKg?.toString() || '');
  
  // Unit preference
  const [useMetric, setUseMetric] = useState(true);
  const [heightFeet, setHeightFeet] = useState('');
  const [heightInches, setHeightInches] = useState('');
  const [weightLbs, setWeightLbs] = useState('');
  
  // Load saved data when available
  useEffect(() => {
    if (data.age) setAge(data.age.toString());
    if (data.sex) setSex(data.sex);
    if (data.heightCm) setHeightCm(data.heightCm.toString());
    if (data.weightKg) setWeightKg(data.weightKg.toString());
  }, [data]);
  
  // Convert between units when toggling
  const handleUnitToggle = (metric: boolean) => {
    setUseMetric(metric);
    
    if (metric) {
      // Convert from imperial to metric
      if (heightFeet || heightInches) {
        const totalInches = (parseInt(heightFeet || '0') * 12) + parseInt(heightInches || '0');
        const cm = Math.round(totalInches * 2.54);
        setHeightCm(cm.toString());
      }
      if (weightLbs) {
        const kg = Math.round(parseFloat(weightLbs) / 2.20462 * 10) / 10;
        setWeightKg(kg.toString());
      }
    } else {
      // Convert from metric to imperial
      if (heightCm) {
        const totalInches = parseFloat(heightCm) / 2.54;
        const feet = Math.floor(totalInches / 12);
        const inches = Math.round(totalInches % 12);
        setHeightFeet(feet.toString());
        setHeightInches(inches.toString());
      }
      if (weightKg) {
        const lbs = Math.round(parseFloat(weightKg) * 2.20462 * 10) / 10;
        setWeightLbs(lbs.toString());
      }
    }
  };
  
  // Validate form
  const isFormValid = () => {
    const ageNum = parseInt(age);
    const heightNum = useMetric ? parseFloat(heightCm) : ((parseInt(heightFeet || '0') * 12) + parseInt(heightInches || '0')) * 2.54;
    const weightNum = useMetric ? parseFloat(weightKg) : parseFloat(weightLbs) / 2.20462;
    
    return (
      sex !== '' &&
      ageNum >= 13 && ageNum <= 100 &&
      heightNum >= 100 && heightNum <= 250 &&
      weightNum >= 30 && weightNum <= 300
    );
  };

  const handleContinue = async () => {
    if (!isFormValid()) return;
    
    setIsNavigating(true);
    
    // Convert to metric for storage
    let finalHeightCm = parseFloat(heightCm);
    let finalWeightKg = parseFloat(weightKg);
    
    if (!useMetric) {
      finalHeightCm = ((parseInt(heightFeet || '0') * 12) + parseInt(heightInches || '0')) * 2.54;
      finalWeightKg = parseFloat(weightLbs) / 2.20462;
    }
    
    await saveData({
      age: parseInt(age),
      sex: sex as Sex,
      heightCm: Math.round(finalHeightCm),
      weightKg: Math.round(finalWeightKg * 10) / 10,
      currentWeight: Math.round(finalWeightKg * 10) / 10,
      currentStep: 'activity_level',
    });
    
    router.push('/start/activity-level');
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
      currentStep={1} 
      totalSteps={3}
      stepLabel="Step 1 of 3"
    >
      <motion.div 
        className="flex-1 flex flex-col items-center justify-start px-4 py-8 lg:py-12"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="w-full max-w-xl lg:max-w-2xl mx-auto">
          {/* Header */}
          <h1 className="font-albert text-[32px] lg:text-[42px] text-text-primary tracking-[-2px] leading-[1.2] mb-4">
            Tell us about yourself
          </h1>
          <p className="font-sans text-[16px] text-text-secondary mb-8">
            This helps us calculate your personalized calorie target.
          </p>

          {/* Unit Toggle */}
          <div className="flex items-center gap-2 mb-6">
            <span className={`font-sans text-[14px] ${useMetric ? 'text-text-primary font-medium' : 'text-text-muted'}`}>
              Metric
            </span>
            <button
              onClick={() => handleUnitToggle(!useMetric)}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                useMetric ? 'bg-[#e1ddd8]' : 'bg-[#a07855]'
              }`}
            >
              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                useMetric ? 'left-0.5' : 'left-6'
              }`} />
            </button>
            <span className={`font-sans text-[14px] ${!useMetric ? 'text-text-primary font-medium' : 'text-text-muted'}`}>
              Imperial
            </span>
          </div>

          {/* Form */}
          <div className="space-y-6">
            {/* Sex Selection */}
            <div>
              <label className="block font-sans text-[14px] font-medium text-text-secondary mb-2">
                Biological Sex
              </label>
              <p className="font-sans text-[12px] text-text-muted mb-3">
                Used for accurate metabolic calculations
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setSex('male')}
                  className={`flex-1 py-4 px-6 rounded-[16px] border-2 font-sans text-[16px] font-medium transition-all ${
                    sex === 'male'
                      ? 'border-[#a07855] bg-[#faf8f6] text-text-primary'
                      : 'border-[#e1ddd8] bg-white text-text-secondary hover:border-[#d4d0cb]'
                  }`}
                >
                  <span className="mr-2">♂</span> Male
                </button>
                <button
                  onClick={() => setSex('female')}
                  className={`flex-1 py-4 px-6 rounded-[16px] border-2 font-sans text-[16px] font-medium transition-all ${
                    sex === 'female'
                      ? 'border-[#a07855] bg-[#faf8f6] text-text-primary'
                      : 'border-[#e1ddd8] bg-white text-text-secondary hover:border-[#d4d0cb]'
                  }`}
                >
                  <span className="mr-2">♀</span> Female
                </button>
              </div>
            </div>

            {/* Age */}
            <div>
              <label className="block font-sans text-[14px] font-medium text-text-secondary mb-2">
                Age
              </label>
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="Enter your age"
                min="13"
                max="100"
                className="w-full py-4 px-5 rounded-[16px] border-2 border-[#e1ddd8] bg-white font-sans text-[16px] text-text-primary placeholder:text-text-muted focus:border-[#a07855] focus:outline-none transition-colors"
              />
            </div>

            {/* Height */}
            <div>
              <label className="block font-sans text-[14px] font-medium text-text-secondary mb-2">
                Height
              </label>
              {useMetric ? (
                <div className="relative">
                  <input
                    type="number"
                    value={heightCm}
                    onChange={(e) => setHeightCm(e.target.value)}
                    placeholder="e.g., 175"
                    min="100"
                    max="250"
                    className="w-full py-4 px-5 pr-12 rounded-[16px] border-2 border-[#e1ddd8] bg-white font-sans text-[16px] text-text-primary placeholder:text-text-muted focus:border-[#a07855] focus:outline-none transition-colors"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 font-sans text-[14px] text-text-muted">cm</span>
                </div>
              ) : (
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      value={heightFeet}
                      onChange={(e) => setHeightFeet(e.target.value)}
                      placeholder="Feet"
                      min="3"
                      max="8"
                      className="w-full py-4 px-5 pr-10 rounded-[16px] border-2 border-[#e1ddd8] bg-white font-sans text-[16px] text-text-primary placeholder:text-text-muted focus:border-[#a07855] focus:outline-none transition-colors"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 font-sans text-[14px] text-text-muted">ft</span>
                  </div>
                  <div className="relative flex-1">
                    <input
                      type="number"
                      value={heightInches}
                      onChange={(e) => setHeightInches(e.target.value)}
                      placeholder="Inches"
                      min="0"
                      max="11"
                      className="w-full py-4 px-5 pr-10 rounded-[16px] border-2 border-[#e1ddd8] bg-white font-sans text-[16px] text-text-primary placeholder:text-text-muted focus:border-[#a07855] focus:outline-none transition-colors"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 font-sans text-[14px] text-text-muted">in</span>
                  </div>
                </div>
              )}
            </div>

            {/* Weight */}
            <div>
              <label className="block font-sans text-[14px] font-medium text-text-secondary mb-2">
                Current Weight
              </label>
              <div className="relative">
                {useMetric ? (
                  <>
                    <input
                      type="number"
                      value={weightKg}
                      onChange={(e) => setWeightKg(e.target.value)}
                      placeholder="e.g., 75"
                      min="30"
                      max="300"
                      step="0.1"
                      className="w-full py-4 px-5 pr-12 rounded-[16px] border-2 border-[#e1ddd8] bg-white font-sans text-[16px] text-text-primary placeholder:text-text-muted focus:border-[#a07855] focus:outline-none transition-colors"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 font-sans text-[14px] text-text-muted">kg</span>
                  </>
                ) : (
                  <>
                    <input
                      type="number"
                      value={weightLbs}
                      onChange={(e) => setWeightLbs(e.target.value)}
                      placeholder="e.g., 165"
                      min="66"
                      max="660"
                      step="0.1"
                      className="w-full py-4 px-5 pr-12 rounded-[16px] border-2 border-[#e1ddd8] bg-white font-sans text-[16px] text-text-primary placeholder:text-text-muted focus:border-[#a07855] focus:outline-none transition-colors"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 font-sans text-[14px] text-text-muted">lbs</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Privacy note */}
          <div className="mt-8 p-4 bg-[#faf8f6] border border-[#e1ddd8] rounded-xl">
            <p className="font-sans text-[13px] text-text-muted leading-[1.5]">
              🔒 Your data is private and only used to calculate your personalized plan. We never share your personal information.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Bottom CTA */}
      <OnboardingCTA onClick={handleContinue} disabled={!isFormValid() || isNavigating}>
        {isNavigating ? 'Saving...' : 'Continue'}
      </OnboardingCTA>
    </OnboardingLayout>
  );
}

