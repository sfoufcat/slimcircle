/**
 * Calorie & Activity Calculator Module
 * 
 * Provides functions for calculating:
 * - BMI (Body Mass Index)
 * - BMR (Basal Metabolic Rate) using Mifflin-St Jeor equation
 * - TDEE (Total Daily Energy Expenditure)
 * - Daily calorie target based on weight loss goals
 * - Calories burned for various activities using MET values
 */

import type { Sex, ActivityLevel, ActivityType } from '@/types';

// ============================================================================
// TYPES
// ============================================================================

export interface BMIParams {
  weightKg: number;
  heightCm: number;
}

export interface BMRParams {
  sex: Sex;
  age: number;
  weightKg: number;
  heightCm: number;
}

export interface TDEEParams {
  bmr: number;
  activityLevel: ActivityLevel;
}

export interface DailyCalorieTargetParams {
  currentWeight: number; // kg
  goalWeight: number; // kg
  startDate: string; // ISO date
  targetDate: string; // ISO date
  tdee: number;
}

export interface DailyCalorieTargetResult {
  targetCaloriesPerDay: number;
  targetDailyDeficit: number;
  weeklyWeightLoss: number; // kg per week
  isHealthy: boolean; // True if deficit is within safe range
  warningMessage?: string;
}

export interface ActivityCaloriesParams {
  activityType: ActivityType;
  durationMinutes: number;
  weightKg: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

// Activity level multipliers for TDEE calculation
const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2, // Little or no exercise
  lightly_active: 1.375, // Light exercise 1-3 days/week
  moderately_active: 1.55, // Moderate exercise 3-5 days/week
  very_active: 1.725, // Hard exercise 6-7 days/week
  extra_active: 1.9, // Very hard exercise, physical job
};

// MET values for common activities
// MET (Metabolic Equivalent of Task) - 1 MET = 1 kcal/kg/hour at rest
const ACTIVITY_MET_VALUES: Record<ActivityType, number> = {
  walking: 3.5, // Moderate pace (3-4 mph)
  running: 9.8, // 6 mph pace
  cycling: 7.5, // Moderate effort (12-14 mph)
  swimming: 6.0, // Moderate effort
  strength_training: 5.0, // Vigorous effort
  pilates: 3.0, // General
  yoga: 2.5, // Hatha yoga
  hiit: 8.0, // High intensity interval training
  dancing: 5.5, // General aerobic
  hiking: 6.0, // Cross-country
  sports: 7.0, // General ball sports
  other: 4.0, // Default moderate activity
};

// Friendly display names for activity types
export const ACTIVITY_DISPLAY_NAMES: Record<ActivityType, string> = {
  walking: 'Walking',
  running: 'Running',
  cycling: 'Cycling',
  swimming: 'Swimming',
  strength_training: 'Strength Training',
  pilates: 'Pilates',
  yoga: 'Yoga',
  hiit: 'HIIT',
  dancing: 'Dancing',
  hiking: 'Hiking',
  sports: 'Sports',
  other: 'Other Activity',
};

// Safe weight loss limits (kg per week)
const MIN_WEEKLY_WEIGHT_LOSS = 0.25; // 0.25 kg/week minimum
const MAX_WEEKLY_WEIGHT_LOSS = 1.0; // 1 kg/week maximum (safe limit)
const MIN_DAILY_CALORIES = 1200; // Absolute minimum for safety

// Calories per kg of body fat
const CALORIES_PER_KG_FAT = 7700;

// ============================================================================
// CALCULATION FUNCTIONS
// ============================================================================

/**
 * Calculate Body Mass Index (BMI)
 * Formula: weight (kg) / height (m)^2
 */
export function calculateBMI({ weightKg, heightCm }: BMIParams): number {
  if (weightKg <= 0 || heightCm <= 0) {
    throw new Error('Weight and height must be positive values');
  }
  
  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);
  
  return Math.round(bmi * 10) / 10; // Round to 1 decimal
}

/**
 * Get BMI category
 */
export function getBMICategory(bmi: number): string {
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Normal weight';
  if (bmi < 30) return 'Overweight';
  if (bmi < 35) return 'Obese (Class I)';
  if (bmi < 40) return 'Obese (Class II)';
  return 'Obese (Class III)';
}

/**
 * Calculate Basal Metabolic Rate (BMR) using Mifflin-St Jeor equation
 * This is the most accurate formula for estimating BMR
 * 
 * For men: BMR = 10 × weight (kg) + 6.25 × height (cm) – 5 × age (years) + 5
 * For women: BMR = 10 × weight (kg) + 6.25 × height (cm) – 5 × age (years) – 161
 */
export function calculateBMR({ sex, age, weightKg, heightCm }: BMRParams): number {
  if (weightKg <= 0 || heightCm <= 0 || age <= 0) {
    throw new Error('Weight, height, and age must be positive values');
  }
  
  const baseBMR = (10 * weightKg) + (6.25 * heightCm) - (5 * age);
  const bmr = sex === 'male' ? baseBMR + 5 : baseBMR - 161;
  
  return Math.round(bmr);
}

/**
 * Calculate Total Daily Energy Expenditure (TDEE)
 * TDEE = BMR × Activity Multiplier
 */
export function calculateTDEE({ bmr, activityLevel }: TDEEParams): number {
  const multiplier = ACTIVITY_MULTIPLIERS[activityLevel] || ACTIVITY_MULTIPLIERS.sedentary;
  const tdee = bmr * multiplier;
  
  return Math.round(tdee);
}

/**
 * Calculate the daily calorie target to reach weight loss goal
 * 
 * @returns Target daily calories and deficit information
 */
export function calculateDailyCalorieTarget({
  currentWeight,
  goalWeight,
  startDate,
  targetDate,
  tdee,
}: DailyCalorieTargetParams): DailyCalorieTargetResult {
  // Calculate total weight to lose
  const weightToLose = currentWeight - goalWeight;
  
  // If goal is to gain weight or maintain, just return TDEE
  if (weightToLose <= 0) {
    return {
      targetCaloriesPerDay: tdee,
      targetDailyDeficit: 0,
      weeklyWeightLoss: 0,
      isHealthy: true,
    };
  }
  
  // Calculate days until target
  const start = new Date(startDate);
  const target = new Date(targetDate);
  const daysUntilTarget = Math.max(1, Math.ceil((target.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  
  // Calculate required daily deficit
  const totalCaloriesToBurn = weightToLose * CALORIES_PER_KG_FAT;
  const dailyDeficit = totalCaloriesToBurn / daysUntilTarget;
  const weeklyWeightLoss = (dailyDeficit * 7) / CALORIES_PER_KG_FAT;
  
  // Calculate target calories
  let targetCaloriesPerDay = tdee - dailyDeficit;
  let isHealthy = true;
  let warningMessage: string | undefined;
  
  // Safety checks
  if (weeklyWeightLoss > MAX_WEEKLY_WEIGHT_LOSS) {
    // Cap at maximum safe rate
    const maxDailyDeficit = (MAX_WEEKLY_WEIGHT_LOSS * CALORIES_PER_KG_FAT) / 7;
    targetCaloriesPerDay = tdee - maxDailyDeficit;
    isHealthy = false;
    warningMessage = `Your target is aggressive (${weeklyWeightLoss.toFixed(1)} kg/week). We recommend max ${MAX_WEEKLY_WEIGHT_LOSS} kg/week for sustainable weight loss. Consider extending your target date.`;
  }
  
  if (targetCaloriesPerDay < MIN_DAILY_CALORIES) {
    targetCaloriesPerDay = MIN_DAILY_CALORIES;
    isHealthy = false;
    warningMessage = `Your calculated calorie target was too low. We've set it to the minimum safe level of ${MIN_DAILY_CALORIES} kcal/day. Consider extending your target date for healthier results.`;
  }
  
  const actualDailyDeficit = tdee - targetCaloriesPerDay;
  
  return {
    targetCaloriesPerDay: Math.round(targetCaloriesPerDay),
    targetDailyDeficit: Math.round(actualDailyDeficit),
    weeklyWeightLoss: Math.round(weeklyWeightLoss * 100) / 100,
    isHealthy,
    warningMessage,
  };
}

/**
 * Estimate calories burned for an activity
 * Formula: Calories = MET × weight (kg) × duration (hours)
 */
export function estimateActivityCalories({
  activityType,
  durationMinutes,
  weightKg,
}: ActivityCaloriesParams): number {
  if (durationMinutes <= 0 || weightKg <= 0) {
    return 0;
  }
  
  const met = ACTIVITY_MET_VALUES[activityType] || ACTIVITY_MET_VALUES.other;
  const durationHours = durationMinutes / 60;
  const calories = met * weightKg * durationHours;
  
  return Math.round(calories);
}

/**
 * Get activity MET value
 */
export function getActivityMET(activityType: ActivityType): number {
  return ACTIVITY_MET_VALUES[activityType] || ACTIVITY_MET_VALUES.other;
}

/**
 * Calculate all user metrics from their profile
 */
export function calculateUserMetrics(profile: {
  sex: Sex;
  age: number;
  weightKg: number;
  heightCm: number;
  activityLevel: ActivityLevel;
  goalWeight?: number;
  targetDate?: string;
}): {
  bmi: number;
  bmiCategory: string;
  bmr: number;
  tdee: number;
  dailyCalorieTarget?: DailyCalorieTargetResult;
} {
  const bmi = calculateBMI({
    weightKg: profile.weightKg,
    heightCm: profile.heightCm,
  });
  
  const bmiCategory = getBMICategory(bmi);
  
  const bmr = calculateBMR({
    sex: profile.sex,
    age: profile.age,
    weightKg: profile.weightKg,
    heightCm: profile.heightCm,
  });
  
  const tdee = calculateTDEE({
    bmr,
    activityLevel: profile.activityLevel,
  });
  
  let dailyCalorieTarget: DailyCalorieTargetResult | undefined;
  
  if (profile.goalWeight && profile.targetDate) {
    dailyCalorieTarget = calculateDailyCalorieTarget({
      currentWeight: profile.weightKg,
      goalWeight: profile.goalWeight,
      startDate: new Date().toISOString().split('T')[0],
      targetDate: profile.targetDate,
      tdee,
    });
  }
  
  return {
    bmi,
    bmiCategory,
    bmr,
    tdee,
    dailyCalorieTarget,
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Convert kg to lbs
 */
export function kgToLbs(kg: number): number {
  return Math.round(kg * 2.20462 * 10) / 10;
}

/**
 * Convert lbs to kg
 */
export function lbsToKg(lbs: number): number {
  return Math.round(lbs / 2.20462 * 10) / 10;
}

/**
 * Convert cm to feet and inches
 */
export function cmToFeetInches(cm: number): { feet: number; inches: number } {
  const totalInches = cm / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return { feet, inches };
}

/**
 * Convert feet and inches to cm
 */
export function feetInchesToCm(feet: number, inches: number): number {
  const totalInches = (feet * 12) + inches;
  return Math.round(totalInches * 2.54);
}

/**
 * Get all activity types for dropdown
 */
export function getActivityTypes(): { value: ActivityType; label: string; met: number }[] {
  return (Object.keys(ACTIVITY_MET_VALUES) as ActivityType[]).map(type => ({
    value: type,
    label: ACTIVITY_DISPLAY_NAMES[type],
    met: ACTIVITY_MET_VALUES[type],
  }));
}

/**
 * Format calorie number with thousands separator
 */
export function formatCalories(calories: number): string {
  return Math.round(calories).toLocaleString();
}
