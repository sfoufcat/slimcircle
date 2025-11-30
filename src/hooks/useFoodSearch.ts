import { useState, useEffect, useCallback, useRef } from 'react';
import type { FoodSearchResult } from '@/lib/food-search';

interface UseFoodSearchOptions {
  debounceMs?: number;
  minQueryLength?: number;
  limit?: number;
}

interface UseFoodSearchReturn {
  results: FoodSearchResult[];
  isLoading: boolean;
  error: string | null;
  search: (query: string) => void;
  clearResults: () => void;
}

/**
 * Hook for searching foods with debouncing
 */
export function useFoodSearch(options: UseFoodSearchOptions = {}): UseFoodSearchReturn {
  const {
    debounceMs = 300,
    minQueryLength = 2,
    limit = 15,
  } = options;

  const [results, setResults] = useState<FoodSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const search = useCallback((query: string) => {
    // Clear previous debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Clear results if query is too short
    if (!query || query.trim().length < minQueryLength) {
      setResults([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    // Debounce the search
    debounceTimerRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const params = new URLSearchParams({
          q: query.trim(),
          limit: limit.toString(),
        });

        const response = await fetch(`/api/foods/search?${params}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error('Failed to search foods');
        }

        const data = await response.json();
        
        // Only update if this request wasn't aborted
        if (!controller.signal.aborted) {
          setResults(data.foods || []);
          setIsLoading(false);
        }
      } catch (err) {
        // Ignore abort errors
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }

        console.error('Food search error:', err);
        setError(err instanceof Error ? err.message : 'Search failed');
        setResults([]);
        setIsLoading(false);
      }
    }, debounceMs);
  }, [debounceMs, minQueryLength, limit]);

  const clearResults = useCallback(() => {
    setResults([]);
    setError(null);
    
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    results,
    isLoading,
    error,
    search,
    clearResults,
  };
}

