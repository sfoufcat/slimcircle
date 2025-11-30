'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { Calendar } from 'lucide-react';
import { useGuestSession } from '@/hooks/useGuestSession';
import { 
  calculateBMI, 
  calculateBMR, 
  calculateTDEE, 
  calculateDailyCalorieTarget,
  formatCalories,
} from '@/lib/calories';
import type { Sex, ActivityLevel } from '@/types';

/**
 * Weight Goal Page
 * Collects goal weight and target date, then calculates and shows the personalized plan
 */
export default function WeightGoalPage() {
  const router = useRouter();
  const { saveData, data, isLoading } = useGuestSession();
  
  // Form state
  const [goalWeight, setGoalWeight] = useState<string>(data.goalWeight?.toString() || '');
  const [goalWeightLbs, setGoalWeightLbs] = useState<string>('');
  const [useMetric, setUseMetric] = useState(true);
  
  // Date state
  const [targetDate, setTargetDate] = useState<string | null>(data.targetDate || null);
  const [dateMonth, setDateMonth] = useState('');
  const [dateDay, setDateDay] = useState('');
  const [dateYear, setDateYear] = useState('');
  const monthRef = useRef<HTMLInputElement>(null);
  const dayRef = useRef<HTMLInputElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);
  const nativeDateRef = useRef<HTMLInputElement>(null);
  
  // UI state
  const [showPlan, setShowPlan] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  
  // Get user's physical profile from session
  const currentWeight = data.weightKg || data.currentWeight || 0;
  const heightCm = data.heightCm || 0;
  const age = data.age || 0;
  const sex = data.sex as Sex || 'male';
  const activityLevel = data.activityLevel as ActivityLevel || 'moderately_active';
  
  // Calculate metrics
  const metrics = useMemo(() => {
    if (!currentWeight || !heightCm || !age || !sex) return null;
    
    const bmi = calculateBMI({ weightKg: currentWeight, heightCm });
    const bmr = calculateBMR({ sex, age, weightKg: currentWeight, heightCm });
    const tdee = calculateTDEE({ bmr, activityLevel });
    
    return { bmi, bmr, tdee };
  }, [currentWeight, heightCm, age, sex, activityLevel]);
  
  // Calculate calorie target when we have goal weight and date
  const calorieTarget = useMemo(() => {
    if (!metrics || !goalWeight || !targetDate) return null;
    
    const goalWeightNum = useMetric ? parseFloat(goalWeight) : parseFloat(goalWeightLbs) / 2.20462;
    if (isNaN(goalWeightNum)) return null;
    
    return calculateDailyCalorieTarget({
      currentWeight,
      goalWeight: goalWeightNum,
      startDate: new Date().toISOString().split('T')[0],
      targetDate,
      tdee: metrics.tdee,
    });
  }, [metrics, goalWeight, goalWeightLbs, targetDate, useMetric, currentWeight]);
  
  // Load saved data
  useEffect(() => {
    if (data.goalWeight) {
      setGoalWeight(data.goalWeight.toString());
      setGoalWeightLbs(Math.round(data.goalWeight * 2.20462 * 10) / 10 + '');
    }
    if (data.targetDate) {
      const [year, month, day] = data.targetDate.split('-');
      setDateYear(year);
      setDateMonth(month);
      setDateDay(day);
      setTargetDate(data.targetDate);
    }
  }, [data]);
  
  // Update targetDate when segments change
  useEffect(() => {
    if (dateMonth && dateDay && dateYear && dateYear.length === 4) {
      const month = dateMonth.padStart(2, '0');
      const day = dateDay.padStart(2, '0');
      const dateStr = `${dateYear}-${month}-${day}`;
      
      const selectedDate = new Date(dateStr);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      
      if (!isNaN(selectedDate.getTime()) && selectedDate >= tomorrow) {
        setTargetDate(dateStr);
        if (error === 'Please select a date in the future.') {
          setError('');
        }
      } else if (!isNaN(selectedDate.getTime())) {
        setTargetDate(null);
        setError('Please select a date in the future.');
      }
    } else {
      setTargetDate(null);
    }
  }, [dateMonth, dateDay, dateYear, error]);
  
  // Get minimum date (tomorrow)
  const minDate = useMemo(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }, []);
  
  // Handle unit toggle
  const handleUnitToggle = (metric: boolean) => {
    setUseMetric(metric);
    if (metric && goalWeightLbs) {
      const kg = Math.round(parseFloat(goalWeightLbs) / 2.20462 * 10) / 10;
      setGoalWeight(kg.toString());
    } else if (!metric && goalWeight) {
      const lbs = Math.round(parseFloat(goalWeight) * 2.20462 * 10) / 10;
      setGoalWeightLbs(lbs.toString());
    }
  };
  
  // Handle date segment changes
  const handleDateSegmentChange = (
    segment: 'month' | 'day' | 'year',
    value: string,
    maxLength: number,
    nextRef?: React.RefObject<HTMLInputElement | null>
  ) => {
    const numericValue = value.replace(/\D/g, '');
    
    if (segment === 'month') {
      let month = numericValue;
      if (parseInt(month) > 12) month = '12';
      if (month.length === 2 && parseInt(month) === 0) month = '01';
      setDateMonth(month.slice(0, maxLength));
      if (month.length >= maxLength && nextRef?.current) {
        nextRef.current.focus();
      }
    } else if (segment === 'day') {
      let day = numericValue;
      if (parseInt(day) > 31) day = '31';
      if (day.length === 2 && parseInt(day) === 0) day = '01';
      setDateDay(day.slice(0, maxLength));
      if (day.length >= maxLength && nextRef?.current) {
        nextRef.current.focus();
      }
    } else {
      setDateYear(numericValue.slice(0, maxLength));
    }
  };
  
  // Handle backspace navigation
  const handleDateKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    segment: 'month' | 'day' | 'year',
    prevRef?: React.RefObject<HTMLInputElement | null>
  ) => {
    const currentValue = segment === 'month' ? dateMonth : segment === 'day' ? dateDay : dateYear;
    
    if (e.key === 'Backspace' && currentValue === '' && prevRef?.current) {
      e.preventDefault();
      prevRef.current.focus();
    }
  };
  
  // Handle native date picker
  const handleNativeDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedDate = e.target.value;
    if (selectedDate) {
      const [year, month, day] = selectedDate.split('-');
      setDateYear(year);
      setDateMonth(month);
      setDateDay(day);
    }
  };
  
  // Validate and show plan
  const handleCalculate = () => {
    const goalWeightNum = useMetric ? parseFloat(goalWeight) : parseFloat(goalWeightLbs) / 2.20462;
    
    if (!goalWeightNum || goalWeightNum < 30 || goalWeightNum > 300) {
      setError('Please enter a valid goal weight.');
      return;
    }
    
    if (!targetDate) {
      setError('Please select a target date.');
      return;
    }
    
    setError('');
    setShowPlan(true);
  };
  
  // Save and continue
  const handleContinue = async () => {
    if (!calorieTarget || !metrics) return;
    
    setIsSaving(true);
    
    const goalWeightNum = useMetric ? parseFloat(goalWeight) : parseFloat(goalWeightLbs) / 2.20462;
    
    await saveData({
      goalWeight: Math.round(goalWeightNum * 10) / 10,
      targetDate: targetDate!,
      bmi: metrics.bmi,
      bmr: metrics.bmr,
      tdee: metrics.tdee,
      dailyCalorieTarget: calorieTarget.targetCaloriesPerDay,
      targetDailyDeficit: calorieTarget.targetDailyDeficit,
      // Also save as goal for compatibility
      goal: `Lose ${Math.round(currentWeight - goalWeightNum)} kg`,
      goalTargetDate: targetDate!,
      currentStep: 'goal_impact',
    });
    
    router.push('/start/goal-impact');
  };
  
  // Calculate weight to lose
  const weightToLose = useMemo(() => {
    const goalWeightNum = useMetric ? parseFloat(goalWeight) : parseFloat(goalWeightLbs) / 2.20462;
    if (!goalWeightNum || !currentWeight) return 0;
    return Math.max(0, currentWeight - goalWeightNum);
  }, [goalWeight, goalWeightLbs, useMetric, currentWeight]);
  
  const isFormValid = () => {
    const goalWeightNum = useMetric ? parseFloat(goalWeight) : parseFloat(goalWeightLbs) / 2.20462;
    return goalWeightNum >= 30 && goalWeightNum <= 300 && targetDate !== null;
  };

  if (isLoading || isSaving) {
    return (
      <div className="fixed inset-0 bg-app-bg flex flex-col items-center justify-center">
        <div className="relative mb-4">
          <div className="w-12 h-12 rounded-full border-2 border-[#e1ddd8]" />
          <div className="absolute inset-0 w-12 h-12 rounded-full border-2 border-transparent border-t-[#a07855] animate-spin" />
        </div>
        <p className="text-text-secondary font-sans text-[15px]">
          {isSaving ? 'Creating your personalized plan...' : 'Loading...'}
        </p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-app-bg overflow-y-auto">
      <div className="min-h-full flex flex-col">
        {/* Logo Header */}
        <motion.div 
          className="pt-6 pb-4 px-6 flex justify-center"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Image 
            src="/logo.jpg" 
            alt="SlimCircle" 
            width={48} 
            height={48} 
            className="rounded-lg"
          />
        </motion.div>

        {/* Progress */}
        <div className="px-6 mb-4">
          <div className="max-w-xl mx-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="font-sans text-[12px] text-text-muted">Step 3 of 3</span>
            </div>
            <div className="h-1 bg-[#e1ddd8] rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#a07855] to-[#c9a07a] rounded-full" style={{ width: '100%' }} />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col items-center justify-start px-4 py-8 lg:py-12">
          <div className="w-full max-w-xl lg:max-w-2xl mx-auto">
            <AnimatePresence mode="wait">
              {!showPlan ? (
                <motion.div
                  key="form"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.5 }}
                >
                  {/* Header */}
                  <h1 className="font-albert text-[36px] lg:text-[48px] text-text-primary tracking-[-2px] leading-[1.2] mb-4">
                    What&apos;s your goal weight?
                  </h1>
                  <p className="font-sans text-[16px] text-text-secondary mb-8">
                    We&apos;ll create a personalized plan to get you there.
                  </p>

                  {/* Current weight display */}
                  <div className="bg-[#faf8f6] border border-[#e1ddd8] rounded-xl p-4 mb-6">
                    <p className="font-sans text-[14px] text-text-muted">
                      Current weight: <span className="font-semibold text-text-primary">{currentWeight} kg</span>
                      {!useMetric && (
                        <span className="text-text-muted"> ({Math.round(currentWeight * 2.20462)} lbs)</span>
                      )}
                    </p>
                  </div>

                  {/* Unit Toggle */}
                  <div className="flex items-center gap-2 mb-6">
                    <span className={`font-sans text-[14px] ${useMetric ? 'text-text-primary font-medium' : 'text-text-muted'}`}>
                      kg
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
                      lbs
                    </span>
                  </div>

                  {/* Goal Weight Input */}
                  <div className="mb-8">
                    <label className="block font-sans text-[18px] font-medium text-text-primary mb-3">
                      I want to weigh...
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={useMetric ? goalWeight : goalWeightLbs}
                        onChange={(e) => {
                          if (useMetric) {
                            setGoalWeight(e.target.value);
                          } else {
                            setGoalWeightLbs(e.target.value);
                          }
                        }}
                        placeholder={useMetric ? 'e.g., 70' : 'e.g., 154'}
                        min={useMetric ? '30' : '66'}
                        max={useMetric ? '300' : '660'}
                        step="0.1"
                        className="w-full py-4 px-5 pr-12 rounded-[16px] border-2 border-[#e1ddd8] bg-white font-sans text-[20px] text-text-primary placeholder:text-text-muted focus:border-[#a07855] focus:outline-none transition-colors"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 font-sans text-[16px] text-text-muted">
                        {useMetric ? 'kg' : 'lbs'}
                      </span>
                    </div>
                    
                    {/* Weight to lose preview */}
                    {weightToLose > 0 && (
                      <p className="mt-2 font-sans text-[14px] text-[#a07855]">
                        That&apos;s {weightToLose.toFixed(1)} kg to lose
                      </p>
                    )}
                  </div>

                  {/* Target Date */}
                  <div className="mb-8">
                    <label className="block font-sans text-[18px] font-medium text-text-primary mb-3">
                      By when?
                    </label>
                    <div className="flex items-center border-2 border-[#e1ddd8] rounded-[16px] px-5 py-4 focus-within:border-[#a07855] transition-colors bg-white">
                      <div className="flex items-center">
                        <input
                          ref={monthRef}
                          type="text"
                          inputMode="numeric"
                          placeholder="MM"
                          value={dateMonth}
                          onChange={(e) => handleDateSegmentChange('month', e.target.value, 2, dayRef)}
                          onKeyDown={(e) => handleDateKeyDown(e, 'month')}
                          className="w-10 bg-transparent outline-none text-center font-sans text-[20px] placeholder:text-text-muted/50"
                          maxLength={2}
                        />
                        <span className="text-text-muted mx-1 text-[20px]">/</span>
                        <input
                          ref={dayRef}
                          type="text"
                          inputMode="numeric"
                          placeholder="DD"
                          value={dateDay}
                          onChange={(e) => handleDateSegmentChange('day', e.target.value, 2, yearRef)}
                          onKeyDown={(e) => handleDateKeyDown(e, 'day', monthRef)}
                          className="w-10 bg-transparent outline-none text-center font-sans text-[20px] placeholder:text-text-muted/50"
                          maxLength={2}
                        />
                        <span className="text-text-muted mx-1 text-[20px]">/</span>
                        <input
                          ref={yearRef}
                          type="text"
                          inputMode="numeric"
                          placeholder="YYYY"
                          value={dateYear}
                          onChange={(e) => handleDateSegmentChange('year', e.target.value, 4)}
                          onKeyDown={(e) => handleDateKeyDown(e, 'year', dayRef)}
                          className="w-16 bg-transparent outline-none text-center font-sans text-[20px] placeholder:text-text-muted/50"
                          maxLength={4}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => nativeDateRef.current?.showPicker()}
                        className="ml-auto p-1 text-text-muted hover:text-[#a07855] transition-colors"
                      >
                        <Calendar className="w-5 h-5" />
                      </button>
                      <input
                        ref={nativeDateRef}
                        type="date"
                        min={minDate}
                        value={targetDate || ''}
                        onChange={handleNativeDateChange}
                        className="sr-only"
                      />
                    </div>
                  </div>

                  {/* Error */}
                  <AnimatePresence>
                    {error && (
                      <motion.div 
                        className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                      >
                        <p className="text-sm text-red-700">{error}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ) : (
                <motion.div
                  key="plan"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.5 }}
                >
                  {/* Plan Preview */}
                  <h1 className="font-albert text-[32px] lg:text-[42px] text-text-primary tracking-[-2px] leading-[1.2] mb-2">
                    Your Personalized Plan
                  </h1>
                  <p className="font-sans text-[16px] text-text-secondary mb-8">
                    Based on your profile and goals
                  </p>

                  {/* Stats Cards */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-gradient-to-br from-[#faf8f6] to-[#f3f1ef] border border-[#e1ddd8] rounded-xl p-4">
                      <p className="font-sans text-[12px] text-text-muted uppercase tracking-wide mb-1">Daily Target</p>
                      <p className="font-albert text-[32px] font-bold text-[#a07855] tracking-[-1px]">
                        {calorieTarget ? formatCalories(calorieTarget.targetCaloriesPerDay) : '—'}
                      </p>
                      <p className="font-sans text-[14px] text-text-muted">kcal / day</p>
                    </div>
                    <div className="bg-gradient-to-br from-[#faf8f6] to-[#f3f1ef] border border-[#e1ddd8] rounded-xl p-4">
                      <p className="font-sans text-[12px] text-text-muted uppercase tracking-wide mb-1">Weekly Loss</p>
                      <p className="font-albert text-[32px] font-bold text-[#22c55e] tracking-[-1px]">
                        {calorieTarget ? calorieTarget.weeklyWeightLoss.toFixed(1) : '—'}
                      </p>
                      <p className="font-sans text-[14px] text-text-muted">kg / week</p>
                    </div>
                  </div>

                  {/* Summary Card */}
                  <div className="bg-white border border-[#e1ddd8] rounded-xl p-5 mb-6">
                    <h3 className="font-albert text-[18px] font-semibold text-text-primary mb-4">Summary</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="font-sans text-[14px] text-text-muted">Current Weight</span>
                        <span className="font-sans text-[14px] font-medium text-text-primary">{currentWeight} kg</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-sans text-[14px] text-text-muted">Goal Weight</span>
                        <span className="font-sans text-[14px] font-medium text-text-primary">
                          {useMetric ? goalWeight : Math.round(parseFloat(goalWeightLbs) / 2.20462)} kg
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-sans text-[14px] text-text-muted">Weight to Lose</span>
                        <span className="font-sans text-[14px] font-medium text-[#a07855]">{weightToLose.toFixed(1)} kg</span>
                      </div>
                      <div className="border-t border-[#e1ddd8] pt-3 mt-3">
                        <div className="flex justify-between">
                          <span className="font-sans text-[14px] text-text-muted">Target Date</span>
                          <span className="font-sans text-[14px] font-medium text-text-primary">
                            {targetDate ? new Date(targetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-sans text-[14px] text-text-muted">Daily Maintenance</span>
                        <span className="font-sans text-[14px] font-medium text-text-primary">{metrics?.tdee ? formatCalories(metrics.tdee) : '—'} kcal</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-sans text-[14px] text-text-muted">Daily Deficit</span>
                        <span className="font-sans text-[14px] font-medium text-[#a07855]">
                          -{calorieTarget ? formatCalories(calorieTarget.targetDailyDeficit) : '—'} kcal
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Warning if aggressive goal */}
                  {calorieTarget && !calorieTarget.isHealthy && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                      <p className="font-sans text-[14px] text-amber-800">
                        ⚠️ {calorieTarget.warningMessage}
                      </p>
                    </div>
                  )}

                  {/* Edit button */}
                  <button
                    onClick={() => setShowPlan(false)}
                    className="font-sans text-[14px] text-[#a07855] hover:text-[#8a6848] transition-colors"
                  >
                    ← Edit my goal
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Bottom CTA */}
        <motion.div 
          className="sticky bottom-0 px-6 pb-8 pt-4 bg-gradient-to-t from-app-bg via-app-bg to-transparent"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <div className="w-full max-w-xl lg:max-w-2xl mx-auto">
            {showPlan ? (
              <button
                onClick={handleContinue}
                disabled={isSaving}
                className="w-full bg-gradient-to-r from-[#f7c948] to-[#f5b820] text-[#2c2520] font-sans font-bold text-[16px] tracking-[-0.5px] leading-[1.4] py-4 px-6 rounded-[32px] shadow-[0px_8px_24px_0px_rgba(247,201,72,0.35)] hover:shadow-[0px_12px_32px_0px_rgba(247,201,72,0.45)] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Continue →'}
              </button>
            ) : (
              <button
                onClick={handleCalculate}
                disabled={!isFormValid()}
                className="w-full bg-[#2c2520] text-white font-sans font-bold text-[16px] tracking-[-0.5px] leading-[1.4] py-4 px-6 rounded-[32px] shadow-[0px_5px_15px_0px_rgba(0,0,0,0.2)] hover:scale-[1.02] active:scale-[0.98] transition-transform disabled:opacity-50 disabled:bg-[#e1ddd8] disabled:text-text-muted disabled:shadow-none"
              >
                Calculate My Plan
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

