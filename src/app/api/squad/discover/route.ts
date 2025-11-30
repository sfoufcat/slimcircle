import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { adminDb } from '@/lib/firebase-admin';
import { MAX_SQUAD_MEMBERS } from '@/lib/squad-constants';
import type { Squad } from '@/types';

interface CoachInfo {
  id: string;
  name: string;
  imageUrl: string;
}

interface PublicSquad extends Squad {
  memberCount: number;
  memberAvatars: string[];
  coach?: CoachInfo | null;
}

/**
 * GET /api/squad/discover
 * Fetches public squads for the discovery page.
 * 
 * Subscription-based filtering:
 * - Premium users see only premium squads (isPremium: true)
 * - Standard users see only standard squads (isPremium: false)
 * 
 * Query params:
 * - search: Filter by squad name (case-insensitive)
 * - sort: 'most_active' | 'most_members' | 'newest' | 'alphabetical'
 */
export async function GET(req: Request) {
  try {
    const { userId, sessionClaims } = await auth();
    
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Get user's subscription tier from Clerk session (SINGLE SOURCE OF TRUTH - no DB call needed for tier)
    // Note: Coaching is NOT a tier - it's a separate product. Only standard/premium/free are tiers.
    const publicMetadata = sessionClaims?.publicMetadata as { tier?: string } | undefined;
    const userTier = publicMetadata?.tier || 'standard';
    // Premium users see premium squads - coaching status doesn't affect squad tier visibility
    const isPremiumUser = userTier === 'premium';

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.toLowerCase() || '';
    const sort = searchParams.get('sort') || 'most_active';

    // Query public squads filtered by premium status based on user tier
    // Premium users see premium squads, Standard users see standard squads
    const query = adminDb.collection('squads')
      .where('visibility', '==', 'public')
      .where('isPremium', '==', isPremiumUser);

    const squadsSnapshot = await query.get();
    
    const squads: PublicSquad[] = [];

    // Process each squad
    for (const doc of squadsSnapshot.docs) {
      const data = doc.data() as Squad;
      
      // Apply search filter (client-side for Firestore limitations)
      if (search && !data.name.toLowerCase().includes(search)) {
        continue;
      }

      // Get member count from squadMembers collection (source of truth)
      const membersSnapshot = await adminDb.collection('squadMembers')
        .where('squadId', '==', doc.id)
        .get();
      
      // Filter out coach from members for avatar display
      const nonCoachMembers = membersSnapshot.docs.filter(
        memberDoc => memberDoc.data().userId !== data.coachId
      );
      const memberCount = nonCoachMembers.length;
      
      // Skip squads that are at capacity
      if (memberCount >= MAX_SQUAD_MEMBERS) {
        continue;
      }
      
      // Fetch first 4 member avatars from squadMembers (excluding coach)
      const memberAvatars: string[] = [];
      const memberDocs = nonCoachMembers.slice(0, 4);
      
      for (const memberDoc of memberDocs) {
        const memberData = memberDoc.data();
        // Use imageUrl from squadMember doc (denormalized) or fetch from users
        if (memberData.imageUrl) {
          memberAvatars.push(memberData.imageUrl);
        } else if (memberData.userId) {
          // Fallback: fetch from users collection
          const userDoc = await adminDb.collection('users').doc(memberData.userId).get();
          if (userDoc.exists) {
            const userData = userDoc.data();
            memberAvatars.push(userData?.avatarUrl || userData?.imageUrl || '');
          }
        }
      }

      // Fetch coach info for premium squads
      let coach: CoachInfo | null = null;
      if (data.isPremium && data.coachId) {
        const coachDoc = await adminDb.collection('users').doc(data.coachId).get();
        if (coachDoc.exists) {
          const coachData = coachDoc.data();
          coach = {
            id: data.coachId,
            name: `${coachData?.firstName || ''} ${coachData?.lastName || ''}`.trim() || 'Coach',
            imageUrl: coachData?.avatarUrl || coachData?.imageUrl || '',
          };
        }
      }

      squads.push({
        ...data,
        id: doc.id,
        memberCount,
        memberAvatars,
        coach,
      });
    }

    // Sort results
    switch (sort) {
      case 'most_active':
        // For now, use avg alignment or member count as proxy for activity
        squads.sort((a, b) => {
          const aScore = a.avgAlignment || a.memberCount;
          const bScore = b.avgAlignment || b.memberCount;
          return bScore - aScore;
        });
        break;
      case 'most_members':
        squads.sort((a, b) => b.memberCount - a.memberCount);
        break;
      case 'newest':
        squads.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'alphabetical':
        squads.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    return NextResponse.json({ 
      squads,
      userTier,
      isPremiumUser,
    });
  } catch (error) {
    console.error('[SQUAD_DISCOVER_ERROR]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

