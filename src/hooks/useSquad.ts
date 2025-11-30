import { useSquadContext } from '@/contexts/SquadContext';

/**
 * useSquad Hook
 * 
 * Returns the current user's squad, members, and stats from the global cache.
 * 
 * OPTIMIZED: Uses global SquadContext which fetches data once at app startup.
 * No API calls on navigation - data is instantly available from cache.
 * 
 * Returns null for squad if user is not in any squad (shows empty state).
 */
export function useSquad() {
  return useSquadContext();
}
