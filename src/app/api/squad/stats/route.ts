import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { getStatsTabData, computeContributionHistory } from '@/lib/squad-alignment';

/**
 * GET /api/squad/stats
 * Gets the expensive stats for the Stats tab (percentile, contribution history)
 * 
 * Query params:
 * - offset: Number of days to skip from today (for pagination, default: 0)
 * - limit: Number of days to fetch (default: 30)
 * 
 * This endpoint is designed to be called AFTER the initial page load
 * to avoid blocking the Squad tab display.
 * 
 * NOTE: Coach is EXCLUDED from all calculations - only regular members count.
 */
export async function GET(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Parse query params for pagination
    const { searchParams } = new URL(request.url);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const limit = parseInt(searchParams.get('limit') || '30', 10);

    // Find the user's squad membership
    const membershipSnapshot = await adminDb.collection('squadMembers')
      .where('userId', '==', userId)
      .limit(1)
      .get();

    // If no membership, return empty stats
    if (membershipSnapshot.empty) {
      return NextResponse.json({
        topPercentile: 0,
        contributionHistory: [],
        squadCreatedAt: null,
        hasMore: false,
      });
    }

    const membership = membershipSnapshot.docs[0].data();
    const squadId = membership.squadId;

    // Verify squad exists and get creation date
    const squadDoc = await adminDb.collection('squads').doc(squadId).get();
    if (!squadDoc.exists) {
      return NextResponse.json({
        topPercentile: 0,
        contributionHistory: [],
        squadCreatedAt: null,
        hasMore: false,
      });
    }

    const squadData = squadDoc.data();
    const squadCreatedAt = squadData?.createdAt || null;
    const coachId = squadData?.coachId || null;

    // If this is a "Load More" request (offset > 0), only fetch contribution history
    if (offset > 0) {
      const contributionHistory = await computeContributionHistory(
        squadId,
        limit,
        coachId,
        offset,
        squadCreatedAt
      );

      // Check if there's more data (we haven't reached squad creation date)
      const hasMore = contributionHistory.length === limit && squadCreatedAt;

      return NextResponse.json({
        topPercentile: 0, // Not needed for load more
        contributionHistory,
        squadCreatedAt,
        hasMore,
      });
    }

    // Initial load - get percentile and contribution history
    const statsData = await getStatsTabData(squadId, squadCreatedAt);

    // Check if there's more data beyond the initial 30 days
    const hasMore = statsData.contributionHistory.length === 30 && squadCreatedAt;

    return NextResponse.json({
      topPercentile: statsData.topPercentile,
      contributionHistory: statsData.contributionHistory,
      squadCreatedAt,
      hasMore,
    });
  } catch (error) {
    console.error('[SQUAD_STATS_ERROR]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

