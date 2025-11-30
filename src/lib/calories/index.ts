/**
 * Calorie Calculator Module
 * 
 * Export all calculator functions for use throughout the app
 */

export {
  // Calculation functions
  calculateBMI,
  getBMICategory,
  calculateBMR,
  calculateTDEE,
  calculateDailyCalorieTarget,
  estimateActivityCalories,
  getActivityMET,
  calculateUserMetrics,
  
  // Utility functions
  kgToLbs,
  lbsToKg,
  cmToFeetInches,
  feetInchesToCm,
  getActivityTypes,
  formatCalories,
  
  // Constants
  ACTIVITY_DISPLAY_NAMES,
} from './calculator';

export type {
  BMIParams,
  BMRParams,
  TDEEParams,
  DailyCalorieTargetParams,
  DailyCalorieTargetResult,
  ActivityCaloriesParams,
} from './calculator';

