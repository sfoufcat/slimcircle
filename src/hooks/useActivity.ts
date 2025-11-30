import { useState, useEffect, useCallback } from 'react';
import type { DailyActivityEntry, CreateActivityRequest, UpdateActivityRequest } from '@/types';

interface UseActivityOptions {
  date: string; // ISO date (YYYY-MM-DD)
}

interface UseActivityReturn {
  entries: DailyActivityEntry[];
  totalCaloriesBurned: number;
  isLoading: boolean;
  error: string | null;
  createEntry: (data: Omit<CreateActivityRequest, 'date'>) => Promise<DailyActivityEntry | null>;
  updateEntry: (id: string, updates: UpdateActivityRequest) => Promise<DailyActivityEntry | null>;
  deleteEntry: (id: string) => Promise<boolean>;
  fetchEntries: () => Promise<void>;
}

export function useActivity({ date }: UseActivityOptions): UseActivityReturn {
  const [entries, setEntries] = useState<DailyActivityEntry[]>([]);
  const [totalCaloriesBurned, setTotalCaloriesBurned] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch entries for the specified date
  const fetchEntries = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/activity?date=${date}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch activity entries');
      }

      setEntries(data.entries || []);
      setTotalCaloriesBurned(data.totalCaloriesBurned || 0);
    } catch (err) {
      console.error('Error fetching activity entries:', err);
      setError(err instanceof Error ? err.message : 'Failed to load activity entries');
      setEntries([]);
      setTotalCaloriesBurned(0);
    } finally {
      setIsLoading(false);
    }
  }, [date]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  // Create a new entry
  const createEntry = useCallback(
    async (data: Omit<CreateActivityRequest, 'date'>): Promise<DailyActivityEntry | null> => {
      try {
        const response = await fetch('/api/activity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...data, date }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to create activity entry');
        }

        // Update local state
        setEntries(prev => [result.entry, ...prev]);
        setTotalCaloriesBurned(prev => prev + result.entry.caloriesBurned);

        return result.entry;
      } catch (err) {
        console.error('Error creating activity entry:', err);
        setError(err instanceof Error ? err.message : 'Failed to create activity entry');
        return null;
      }
    },
    [date]
  );

  // Update an entry
  const updateEntry = useCallback(
    async (id: string, updates: UpdateActivityRequest): Promise<DailyActivityEntry | null> => {
      try {
        const response = await fetch(`/api/activity/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to update activity entry');
        }

        // Update local state
        setEntries(prev => {
          const oldEntry = prev.find(e => e.id === id);
          const newEntries = prev.map(entry => 
            entry.id === id ? result.entry : entry
          );
          
          // Update total calories burned
          if (oldEntry) {
            setTotalCaloriesBurned(prevTotal => 
              prevTotal - oldEntry.caloriesBurned + result.entry.caloriesBurned
            );
          }
          
          return newEntries;
        });

        return result.entry;
      } catch (err) {
        console.error('Error updating activity entry:', err);
        setError(err instanceof Error ? err.message : 'Failed to update activity entry');
        return null;
      }
    },
    []
  );

  // Delete an entry
  const deleteEntry = useCallback(async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/activity/${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete activity entry');
      }

      // Update local state
      setEntries(prev => {
        const deletedEntry = prev.find(e => e.id === id);
        if (deletedEntry) {
          setTotalCaloriesBurned(prevTotal => prevTotal - deletedEntry.caloriesBurned);
        }
        return prev.filter(entry => entry.id !== id);
      });

      return true;
    } catch (err) {
      console.error('Error deleting activity entry:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete activity entry');
      return false;
    }
  }, []);

  return {
    entries,
    totalCaloriesBurned,
    isLoading,
    error,
    createEntry,
    updateEntry,
    deleteEntry,
    fetchEntries,
  };
}

