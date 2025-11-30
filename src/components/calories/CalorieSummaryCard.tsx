'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Flame, Utensils, Activity, Target, TrendingDown, TrendingUp } from 'lucide-react';
import { formatCalories } from '@/lib/calories';

interface CalorieSummaryCardProps {
  targetCalories: number;
  consumedCalories: number;
  burnedCalories: number;
  className?: string;
}

export function CalorieSummaryCard({
  targetCalories,
  consumedCalories,
  burnedCalories,
  className = '',
}: CalorieSummaryCardProps) {
  // Calculate net calories and deficit
  const netCalories = consumedCalories - burnedCalories;
  const deficitVsTarget = targetCalories - netCalories;
  const isUnderTarget = netCalories <= targetCalories;
  
  // Calculate progress percentage (capped at 100%)
  const progressPercentage = Math.min(100, (netCalories / targetCalories) * 100);
  
  // Determine status message
  const statusMessage = useMemo(() => {
    if (netCalories === 0) return 'Start logging your meals!';
    if (isUnderTarget) {
      const remaining = targetCalories - netCalories;
      return `${formatCalories(remaining)} kcal remaining`;
    } else {
      const over = netCalories - targetCalories;
      return `${formatCalories(over)} kcal over target`;
    }
  }, [netCalories, isUnderTarget, targetCalories]);

  return (
    <motion.div
      className={`bg-gradient-to-br from-[#faf8f6] to-[#f3f1ef] dark:from-[#171b22] dark:to-[#1f242d] rounded-[20px] p-5 border border-[#e1ddd8] dark:border-[#262b35] ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-albert text-[18px] font-semibold text-text-primary dark:text-[#f5f5f8] tracking-[-0.5px]">
          Today&apos;s Calories
        </h3>
        <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${
          isUnderTarget 
            ? 'bg-[#ecfdf5] text-[#22c55e]' 
            : 'bg-red-50 text-red-500'
        }`}>
          {isUnderTarget ? (
            <TrendingDown className="w-3.5 h-3.5" />
          ) : (
            <TrendingUp className="w-3.5 h-3.5" />
          )}
          <span className="font-sans text-[11px] font-medium">
            {isUnderTarget ? 'On Track' : 'Over'}
          </span>
        </div>
      </div>

      {/* Main calorie display */}
      <div className="text-center mb-4">
        <div className="flex items-baseline justify-center gap-1">
          <span className={`font-albert text-[48px] font-bold tracking-[-2px] ${
            isUnderTarget ? 'text-[#a07855]' : 'text-red-500'
          }`}>
            {formatCalories(netCalories)}
          </span>
          <span className="font-sans text-[16px] text-text-muted">
            / {formatCalories(targetCalories)}
          </span>
        </div>
        <p className={`font-sans text-[14px] ${
          isUnderTarget ? 'text-text-muted' : 'text-red-500'
        }`}>
          {statusMessage}
        </p>
      </div>

      {/* Progress bar */}
      <div className="mb-5">
        <div className="h-3 bg-[#e1ddd8] dark:bg-[#262b35] rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${
              isUnderTarget 
                ? 'bg-gradient-to-r from-[#a07855] to-[#c9a07a]'
                : 'bg-gradient-to-r from-red-400 to-red-500'
            }`}
            initial={{ width: 0 }}
            animate={{ width: `${progressPercentage}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3">
        {/* Target */}
        <div className="text-center p-3 bg-white dark:bg-[#11141b] rounded-[14px]">
          <div className="flex justify-center mb-1">
            <Target className="w-4 h-4 text-text-muted" />
          </div>
          <p className="font-albert text-[20px] font-bold text-text-primary dark:text-[#f5f5f8] tracking-[-0.5px]">
            {formatCalories(targetCalories)}
          </p>
          <p className="font-sans text-[11px] text-text-muted">Target</p>
        </div>

        {/* Consumed */}
        <div className="text-center p-3 bg-white dark:bg-[#11141b] rounded-[14px]">
          <div className="flex justify-center mb-1">
            <Utensils className="w-4 h-4 text-[#a07855]" />
          </div>
          <p className="font-albert text-[20px] font-bold text-[#a07855] tracking-[-0.5px]">
            {formatCalories(consumedCalories)}
          </p>
          <p className="font-sans text-[11px] text-text-muted">Consumed</p>
        </div>

        {/* Burned */}
        <div className="text-center p-3 bg-white dark:bg-[#11141b] rounded-[14px]">
          <div className="flex justify-center mb-1">
            <Flame className="w-4 h-4 text-[#22c55e]" />
          </div>
          <p className="font-albert text-[20px] font-bold text-[#22c55e] tracking-[-0.5px]">
            -{formatCalories(burnedCalories)}
          </p>
          <p className="font-sans text-[11px] text-text-muted">Burned</p>
        </div>
      </div>

      {/* Deficit info */}
      {deficitVsTarget !== 0 && (
        <div className={`mt-4 p-3 rounded-[12px] ${
          isUnderTarget 
            ? 'bg-[#ecfdf5] dark:bg-[#052e16]' 
            : 'bg-red-50 dark:bg-red-950'
        }`}>
          <div className="flex items-center gap-2">
            <Activity className={`w-4 h-4 ${isUnderTarget ? 'text-[#22c55e]' : 'text-red-500'}`} />
            <p className={`font-sans text-[13px] ${isUnderTarget ? 'text-[#166534]' : 'text-red-700'}`}>
              {isUnderTarget ? (
                <>You&apos;re <strong>{formatCalories(Math.abs(deficitVsTarget))} kcal</strong> under your daily target. Great work!</>
              ) : (
                <>You&apos;re <strong>{formatCalories(Math.abs(deficitVsTarget))} kcal</strong> over your daily target.</>
              )}
            </p>
          </div>
        </div>
      )}
    </motion.div>
  );
}

