import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { adminDb } from '@/lib/firebase-admin';
import { getStreamServerClient } from '@/lib/stream-server';
import type { Squad } from '@/types';

/**
 * POST /api/squad/leave
 * Leave the current squad.
 * 
 * Removes user from:
 * - squad.memberIds array
 * - squadMembers collection
 * - user.squadId
 * - Stream Chat channel
 */
export async function POST() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Get user's current squad - check both user doc and squadMembers collection
    const userDoc = await adminDb.collection('users').doc(userId).get();
    const userData = userDoc.exists ? userDoc.data() : null;
    let squadId = userData?.squadId;

    // Fallback: Check squadMembers collection if user.squadId is not set
    if (!squadId) {
      const membershipSnapshot = await adminDb.collection('squadMembers')
        .where('userId', '==', userId)
        .limit(1)
        .get();
      
      if (!membershipSnapshot.empty) {
        squadId = membershipSnapshot.docs[0].data().squadId;
      }
    }

    if (!squadId) {
      return NextResponse.json({ error: 'You are not in a squad' }, { status: 400 });
    }

    // Get squad data
    const squadRef = adminDb.collection('squads').doc(squadId);
    const squadDoc = await squadRef.get();

    if (!squadDoc.exists) {
      // Squad was deleted, just clear user's squadId
      await adminDb.collection('users').doc(userId).update({
        squadId: null,
        updatedAt: new Date().toISOString(),
      });
      return NextResponse.json({ success: true });
    }

    const squad = squadDoc.data() as Squad;

    // Check if user is the coach - coaches can't leave (must be removed by admin)
    if (squad.coachId === userId) {
      return NextResponse.json({ 
        error: 'Coaches cannot leave their squad. Contact an admin to reassign.' 
      }, { status: 400 });
    }

    const now = new Date().toISOString();

    // Remove from memberIds array
    const memberIds = squad.memberIds || [];
    const updatedMemberIds = memberIds.filter(id => id !== userId);
    await squadRef.update({
      memberIds: updatedMemberIds,
      updatedAt: now,
    });

    // Delete squadMember document
    const membershipSnapshot = await adminDb.collection('squadMembers')
      .where('squadId', '==', squadId)
      .where('userId', '==', userId)
      .get();

    const batch = adminDb.batch();
    membershipSnapshot.forEach(doc => {
      batch.delete(doc.ref);
    });

    // Clear user's squadId
    batch.update(adminDb.collection('users').doc(userId), {
      squadId: null,
      updatedAt: now,
    });

    await batch.commit();

    // Remove from Stream Chat channel
    // Try the stored chatChannelId first, then fallback to standard convention
    const channelIdsToTry = [
      squad.chatChannelId,
      `squad-${squadId}`, // Standard convention used in squad creation
    ].filter((id): id is string => Boolean(id));

    // Deduplicate in case they're the same
    const uniqueChannelIds = [...new Set(channelIdsToTry)];

    try {
      const streamClient = await getStreamServerClient();
      let removed = false;

      for (const channelId of uniqueChannelIds) {
        try {
          const channel = streamClient.channel('messaging', channelId);
          await channel.removeMembers([userId]);
          console.log(`[SQUAD_LEAVE] Successfully removed user ${userId} from channel ${channelId}`);
          removed = true;
          // Don't break - try to remove from all possible channels to be thorough
        } catch (channelError) {
          // Log but continue trying other channel IDs
          console.warn(`[SQUAD_LEAVE] Failed to remove user ${userId} from channel ${channelId}:`, channelError);
        }
      }

      if (!removed && uniqueChannelIds.length > 0) {
        console.error(`[SQUAD_LEAVE] Could not remove user ${userId} from any squad chat channel. Tried: ${uniqueChannelIds.join(', ')}`);
      }
    } catch (streamError) {
      console.error('[STREAM_REMOVE_MEMBER_ERROR] Failed to initialize Stream client:', streamError);
      // Don't fail the leave if Stream fails - user is already removed from squad in DB
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[SQUAD_LEAVE_ERROR]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

