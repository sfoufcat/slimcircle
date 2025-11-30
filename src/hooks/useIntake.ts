import { useState, useEffect, useCallback } from 'react';
import type { DailyIntakeEntry, CreateIntakeRequest, UpdateIntakeRequest, MealIngredient } from '@/types';

interface UseIntakeOptions {
  date: string; // ISO date (YYYY-MM-DD)
}

interface UseIntakeReturn {
  entries: DailyIntakeEntry[];
  totalCalories: number;
  isLoading: boolean;
  error: string | null;
  createEntry: (data: Omit<CreateIntakeRequest, 'date'>) => Promise<DailyIntakeEntry | null>;
  updateEntry: (id: string, updates: UpdateIntakeRequest) => Promise<DailyIntakeEntry | null>;
  deleteEntry: (id: string) => Promise<boolean>;
  fetchEntries: () => Promise<void>;
}

export function useIntake({ date }: UseIntakeOptions): UseIntakeReturn {
  const [entries, setEntries] = useState<DailyIntakeEntry[]>([]);
  const [totalCalories, setTotalCalories] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch entries for the specified date
  const fetchEntries = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/intake?date=${date}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch intake entries');
      }

      setEntries(data.entries || []);
      setTotalCalories(data.totalCalories || 0);
    } catch (err) {
      console.error('Error fetching intake entries:', err);
      setError(err instanceof Error ? err.message : 'Failed to load intake entries');
      setEntries([]);
      setTotalCalories(0);
    } finally {
      setIsLoading(false);
    }
  }, [date]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  // Create a new entry
  const createEntry = useCallback(
    async (data: Omit<CreateIntakeRequest, 'date'>): Promise<DailyIntakeEntry | null> => {
      try {
        const response = await fetch('/api/intake', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...data, date }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to create intake entry');
        }

        // Update local state
        setEntries(prev => [result.entry, ...prev]);
        setTotalCalories(prev => prev + result.entry.totalCalories);

        return result.entry;
      } catch (err) {
        console.error('Error creating intake entry:', err);
        setError(err instanceof Error ? err.message : 'Failed to create intake entry');
        return null;
      }
    },
    [date]
  );

  // Update an entry
  const updateEntry = useCallback(
    async (id: string, updates: UpdateIntakeRequest): Promise<DailyIntakeEntry | null> => {
      try {
        const response = await fetch(`/api/intake/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to update intake entry');
        }

        // Update local state
        setEntries(prev => {
          const oldEntry = prev.find(e => e.id === id);
          const newEntries = prev.map(entry => 
            entry.id === id ? result.entry : entry
          );
          
          // Update total calories
          if (oldEntry) {
            setTotalCalories(prevTotal => 
              prevTotal - oldEntry.totalCalories + result.entry.totalCalories
            );
          }
          
          return newEntries;
        });

        return result.entry;
      } catch (err) {
        console.error('Error updating intake entry:', err);
        setError(err instanceof Error ? err.message : 'Failed to update intake entry');
        return null;
      }
    },
    []
  );

  // Delete an entry
  const deleteEntry = useCallback(async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/intake/${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete intake entry');
      }

      // Update local state
      setEntries(prev => {
        const deletedEntry = prev.find(e => e.id === id);
        if (deletedEntry) {
          setTotalCalories(prevTotal => prevTotal - deletedEntry.totalCalories);
        }
        return prev.filter(entry => entry.id !== id);
      });

      return true;
    } catch (err) {
      console.error('Error deleting intake entry:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete intake entry');
      return false;
    }
  }, []);

  return {
    entries,
    totalCalories,
    isLoading,
    error,
    createEntry,
    updateEntry,
    deleteEntry,
    fetchEntries,
  };
}

/**
 * Helper function to calculate calories for ingredients
 */
export function calculateIngredientCalories(ingredient: Omit<MealIngredient, 'id' | 'calories'>): number {
  return Math.round((ingredient.grams / 100) * ingredient.caloriesPer100g);
}

/**
 * Helper function to calculate total meal calories
 */
export function calculateMealCalories(ingredients: Omit<MealIngredient, 'id' | 'calories'>[]): number {
  return ingredients.reduce((sum, ing) => sum + calculateIngredientCalories(ing), 0);
}

