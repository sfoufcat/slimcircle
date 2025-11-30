import { useState, useEffect, useCallback, useMemo } from 'react';
import { useIntake } from './useIntake';
import { useActivity } from './useActivity';
import type { DailyCalorieSummary } from '@/types';

interface UseCalorieDataOptions {
  date?: string; // ISO date (YYYY-MM-DD), defaults to today
}

interface UseCalorieDataReturn {
  summary: DailyCalorieSummary | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to get combined calorie data for a date
 * Combines intake, activity, and user's calorie target
 */
export function useCalorieData({ date }: UseCalorieDataOptions = {}): UseCalorieDataReturn {
  const today = date || new Date().toISOString().split('T')[0];
  
  const { 
    totalCalories: consumedCalories, 
    isLoading: intakeLoading,
    fetchEntries: fetchIntake,
  } = useIntake({ date: today });
  
  const { 
    totalCaloriesBurned: burnedCalories, 
    isLoading: activityLoading,
    fetchEntries: fetchActivity,
  } = useActivity({ date: today });
  
  const [targetCalories, setTargetCalories] = useState<number>(2000); // Default
  const [userLoading, setUserLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch user's calorie target
  const fetchUserData = useCallback(async () => {
    setUserLoading(true);
    try {
      const response = await fetch('/api/user/me');
      const data = await response.json();
      
      if (data.user?.weightLossProfile?.dailyCalorieTarget) {
        setTargetCalories(data.user.weightLossProfile.dailyCalorieTarget);
      } else if (data.user?.weightLossProfile?.tdee) {
        // If no specific target, use TDEE minus a moderate deficit
        setTargetCalories(data.user.weightLossProfile.tdee - 500);
      }
    } catch (err) {
      console.error('Error fetching user calorie data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch user data');
    } finally {
      setUserLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  // Calculate summary
  const summary = useMemo<DailyCalorieSummary | null>(() => {
    if (userLoading) return null;
    
    const netCalories = consumedCalories - burnedCalories;
    const deficitVsTarget = targetCalories - netCalories;
    
    return {
      date: today,
      targetCalories,
      consumedCalories,
      burnedCalories,
      netCalories,
      deficitVsTarget,
    };
  }, [today, targetCalories, consumedCalories, burnedCalories, userLoading]);

  // Refetch all data
  const refetch = useCallback(async () => {
    await Promise.all([
      fetchUserData(),
      fetchIntake(),
      fetchActivity(),
    ]);
  }, [fetchUserData, fetchIntake, fetchActivity]);

  return {
    summary,
    isLoading: userLoading || intakeLoading || activityLoading,
    error,
    refetch,
  };
}

