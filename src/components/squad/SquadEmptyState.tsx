'use client';

import { SquadDiscovery } from './SquadDiscovery';

/**
 * GroupEmptyState Component (SquadEmptyState)
 * 
 * Displays when user is not yet assigned to an accountability group.
 * Now renders the Group Discovery page instead of static waiting state.
 * 
 * The original "Finding your accountability partners" UI has been extracted to 
 * GroupEmptyInfo component for reuse in other contexts (e.g., coach view).
 */

export function SquadEmptyState() {
  return <SquadDiscovery />;
}





