'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useUser } from '@clerk/nextjs';
import type { Squad, SquadMember, SquadStats, ContributionDay } from '@/types';

interface SquadContextValue {
  squad: Squad | null;
  members: SquadMember[];
  stats: SquadStats | null;
  isLoading: boolean;
  isLoadingStats: boolean;
  isLoadingMoreContributions: boolean;
  hasMoreContributions: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  fetchStatsTabData: () => Promise<void>;
  loadMoreContributions: () => Promise<void>;
}

const SquadContext = createContext<SquadContextValue | undefined>(undefined);

// Global cache to persist across re-renders and navigation
let globalSquadData: {
  squad: Squad | null;
  members: SquadMember[];
  stats: SquadStats | null;
  fetchedForUserId: string | null;
  statsLoaded: boolean;
  contributionDaysLoaded: number;
  hasMoreContributions: boolean;
} = {
  squad: null,
  members: [],
  stats: null,
  fetchedForUserId: null,
  statsLoaded: false,
  contributionDaysLoaded: 0,
  hasMoreContributions: true,
};

interface SquadProviderProps {
  children: ReactNode;
}

/**
 * Global Squad Provider
 * 
 * Fetches squad data once at app startup and caches it for the session.
 * This eliminates the API call delay when navigating to pages that need squad data.
 * 
 * The data is cached globally and persists across navigation.
 * Refetch is available for when squad data might have changed.
 */
export function SquadProvider({ children }: SquadProviderProps) {
  const { user, isLoaded } = useUser();
  const [squad, setSquad] = useState<Squad | null>(globalSquadData.squad);
  const [members, setMembers] = useState<SquadMember[]>(globalSquadData.members);
  const [stats, setStats] = useState<SquadStats | null>(globalSquadData.stats);
  const [isLoading, setIsLoading] = useState(!globalSquadData.fetchedForUserId);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [isLoadingMoreContributions, setIsLoadingMoreContributions] = useState(false);
  const [hasMoreContributions, setHasMoreContributions] = useState(globalSquadData.hasMoreContributions);
  const [error, setError] = useState<string | null>(null);

  // Fetch squad data with staggered loading for instant UI
  const fetchSquad = useCallback(async (userId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      // STEP 1: Fast fetch without stats - renders page instantly with skeletons
      const fastResponse = await fetch('/api/squad/me?includeStats=false');
      
      if (!fastResponse.ok) {
        throw new Error('Failed to fetch squad');
      }

      const fastData = await fastResponse.json();

      // Update state immediately for instant render (with null alignment values)
      globalSquadData = {
        squad: fastData.squad,
        members: fastData.members || [],
        stats: fastData.stats,
        fetchedForUserId: userId,
        statsLoaded: false,
        contributionDaysLoaded: 0,
        hasMoreContributions: true,
      };

      setSquad(fastData.squad);
      setMembers(fastData.members || []);
      setStats(fastData.stats);
      setIsLoading(false); // Page can render now!

      // STEP 2: Fetch full stats in background (fills in the alignment bars)
      if (fastData.squad) {
        const fullResponse = await fetch('/api/squad/me?includeStats=true');
        
        if (fullResponse.ok) {
          const fullData = await fullResponse.json();
          
          // Update with real alignment data
          globalSquadData = {
            squad: fullData.squad,
            members: fullData.members || [],
            stats: fullData.stats,
            fetchedForUserId: userId,
            statsLoaded: false,
            contributionDaysLoaded: globalSquadData.contributionDaysLoaded,
            hasMoreContributions: globalSquadData.hasMoreContributions,
          };

          setSquad(fullData.squad);
          setMembers(fullData.members || []);
          setStats(fullData.stats);
        }
      }

    } catch (err) {
      console.error('Error fetching squad:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch squad');
      
      // Clear cache on error
      globalSquadData = {
        squad: null,
        members: [],
        stats: null,
        fetchedForUserId: userId,
        statsLoaded: false,
        contributionDaysLoaded: 0,
        hasMoreContributions: true,
      };
      
      setSquad(null);
      setMembers([]);
      setStats(null);
      setIsLoading(false);
    }
  }, []);

  // Fetch expensive stats tab data (lazy loaded)
  const fetchStatsTabData = useCallback(async () => {
    // Don't refetch if already loaded
    if (globalSquadData.statsLoaded || isLoadingStats) return;
    
    try {
      setIsLoadingStats(true);

      const response = await fetch('/api/squad/stats');
      
      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }

      const data: { 
        topPercentile: number; 
        contributionHistory: ContributionDay[];
        hasMore: boolean;
      } = await response.json();

      // Merge with existing stats
      const updatedStats = stats ? {
        ...stats,
        topPercentile: data.topPercentile,
        contributionHistory: data.contributionHistory,
      } : null;

      // Update global cache
      globalSquadData.stats = updatedStats;
      globalSquadData.statsLoaded = true;
      globalSquadData.contributionDaysLoaded = data.contributionHistory.length;
      globalSquadData.hasMoreContributions = data.hasMore;
      
      setStats(updatedStats);
      setHasMoreContributions(data.hasMore);

    } catch (err) {
      console.error('Error fetching stats tab data:', err);
      // Don't set error - just log it, basic data is still available
    } finally {
      setIsLoadingStats(false);
    }
  }, [stats, isLoadingStats]);

  // Load more contribution history (pagination)
  const loadMoreContributions = useCallback(async () => {
    if (isLoadingMoreContributions || !hasMoreContributions || !stats) return;
    
    try {
      setIsLoadingMoreContributions(true);

      const offset = globalSquadData.contributionDaysLoaded;
      const response = await fetch(`/api/squad/stats?offset=${offset}&limit=30`);
      
      if (!response.ok) {
        throw new Error('Failed to load more contributions');
      }

      const data: { 
        contributionHistory: ContributionDay[];
        hasMore: boolean;
      } = await response.json();

      // Append new data to existing contribution history
      const updatedStats = {
        ...stats,
        contributionHistory: [...stats.contributionHistory, ...data.contributionHistory],
      };

      // Update global cache
      globalSquadData.stats = updatedStats;
      globalSquadData.contributionDaysLoaded += data.contributionHistory.length;
      globalSquadData.hasMoreContributions = data.hasMore;
      
      setStats(updatedStats);
      setHasMoreContributions(data.hasMore);

    } catch (err) {
      console.error('Error loading more contributions:', err);
    } finally {
      setIsLoadingMoreContributions(false);
    }
  }, [stats, isLoadingMoreContributions, hasMoreContributions]);

  // Manual refetch function
  const refetch = useCallback(async () => {
    if (user?.id) {
      globalSquadData.statsLoaded = false;
      globalSquadData.contributionDaysLoaded = 0;
      globalSquadData.hasMoreContributions = true;
      setHasMoreContributions(true);
      await fetchSquad(user.id);
    }
  }, [user?.id, fetchSquad]);

  // Initial fetch when user is available
  useEffect(() => {
    if (!isLoaded) return;

    // No user = clear data
    if (!user) {
      globalSquadData = {
        squad: null,
        members: [],
        stats: null,
        fetchedForUserId: null,
        statsLoaded: false,
        contributionDaysLoaded: 0,
        hasMoreContributions: true,
      };
      setSquad(null);
      setMembers([]);
      setStats(null);
      setIsLoading(false);
      setHasMoreContributions(true);
      return;
    }

    // Already fetched for this user = use cached data
    if (globalSquadData.fetchedForUserId === user.id) {
      setSquad(globalSquadData.squad);
      setMembers(globalSquadData.members);
      setStats(globalSquadData.stats);
      setIsLoading(false);
      return;
    }

    // Fetch for new user
    fetchSquad(user.id);
  }, [user, isLoaded, fetchSquad]);

  return (
    <SquadContext.Provider value={{
      squad,
      members,
      stats,
      isLoading,
      isLoadingStats,
      isLoadingMoreContributions,
      hasMoreContributions,
      error,
      refetch,
      fetchStatsTabData,
      loadMoreContributions,
    }}>
      {children}
    </SquadContext.Provider>
  );
}

/**
 * Hook to access the shared squad data
 * 
 * Returns the globally cached squad data that was fetched at app startup.
 * No duplicate API calls - everyone gets the same cached data.
 */
export function useSquadContext(): SquadContextValue {
  const context = useContext(SquadContext);
  if (context === undefined) {
    throw new Error('useSquadContext must be used within a SquadProvider');
  }
  return context;
}

