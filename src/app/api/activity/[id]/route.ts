import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { estimateActivityCalories, ACTIVITY_DISPLAY_NAMES } from '@/lib/calories';
import type { UpdateActivityRequest, ActivityType } from '@/types';

/**
 * GET /api/activity/[id]
 * Fetch a single activity entry
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const doc = await adminDb.collection('activityEntries').doc(id).get();

    if (!doc.exists) {
      return NextResponse.json({ error: 'Activity entry not found' }, { status: 404 });
    }

    const entryData = doc.data();

    // Verify ownership
    if (entryData?.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const entry = { id: doc.id, ...entryData };
    return NextResponse.json({ entry });
  } catch (error) {
    console.error('Error fetching activity entry:', error);
    return NextResponse.json({ error: 'Failed to fetch activity entry' }, { status: 500 });
  }
}

/**
 * PATCH /api/activity/[id]
 * Update an activity entry
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body: UpdateActivityRequest = await request.json();
    
    const docRef = adminDb.collection('activityEntries').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.json({ error: 'Activity entry not found' }, { status: 404 });
    }

    const existingEntry = doc.data();

    // Verify ownership
    if (existingEntry?.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Build update object
    const updates: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };

    if (body.activityType !== undefined) {
      updates.activityType = body.activityType;
      // Update display name if not custom
      if (!body.activityName) {
        updates.activityName = ACTIVITY_DISPLAY_NAMES[body.activityType as ActivityType] || body.activityType;
      }
    }
    
    if (body.activityName !== undefined) updates.activityName = body.activityName;
    if (body.isPrivate !== undefined) updates.isPrivate = body.isPrivate;

    // If duration or activity type changed, recalculate calories
    if (body.durationMinutes !== undefined || body.activityType !== undefined) {
      // Get user's weight for calorie calculation
      const userDoc = await adminDb.collection('users').doc(userId).get();
      const userData = userDoc.data();
      const weightKg = userData?.weightLossProfile?.weightKg || userData?.currentWeight || 70;

      const activityType = body.activityType || existingEntry?.activityType;
      const durationMinutes = body.durationMinutes || existingEntry?.durationMinutes;

      updates.durationMinutes = durationMinutes;
      updates.caloriesBurned = estimateActivityCalories({
        activityType: activityType as ActivityType,
        durationMinutes,
        weightKg,
      });
    }

    await docRef.update(updates);

    const updatedDoc = await docRef.get();
    const entry = { id: updatedDoc.id, ...updatedDoc.data() };

    return NextResponse.json({ entry, success: true });
  } catch (error) {
    console.error('Error updating activity entry:', error);
    return NextResponse.json({ error: 'Failed to update activity entry' }, { status: 500 });
  }
}

/**
 * DELETE /api/activity/[id]
 * Delete an activity entry
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const docRef = adminDb.collection('activityEntries').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.json({ error: 'Activity entry not found' }, { status: 404 });
    }

    const entry = doc.data();

    // Verify ownership
    if (entry?.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await docRef.delete();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting activity entry:', error);
    return NextResponse.json({ error: 'Failed to delete activity entry' }, { status: 500 });
  }
}

