import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { v4 as uuidv4 } from 'uuid';
import { estimateActivityCalories, ACTIVITY_DISPLAY_NAMES } from '@/lib/calories';
import type { DailyActivityEntry, CreateActivityRequest, ActivityType } from '@/types';

/**
 * GET /api/activity
 * Fetch activity entries for a specific date
 * Query params: date (required, YYYY-MM-DD)
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (!date) {
      return NextResponse.json({ error: 'Date parameter is required' }, { status: 400 });
    }

    // Fetch activity entries for this user and date
    const activitySnapshot = await adminDb
      .collection('activityEntries')
      .where('userId', '==', userId)
      .where('date', '==', date)
      .orderBy('createdAt', 'desc')
      .get();

    const entries: DailyActivityEntry[] = activitySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as DailyActivityEntry));

    // Calculate total calories burned for the day
    const totalCaloriesBurned = entries.reduce((sum, entry) => sum + entry.caloriesBurned, 0);

    return NextResponse.json({
      entries,
      totalCaloriesBurned,
      date,
    });
  } catch (error) {
    console.error('Error fetching activity entries:', error);
    return NextResponse.json({ error: 'Failed to fetch activity entries' }, { status: 500 });
  }
}

/**
 * POST /api/activity
 * Create a new activity entry
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: CreateActivityRequest = await request.json();
    const { date, activityType, activityName, durationMinutes, isPrivate = false } = body;

    if (!date || !activityType || !durationMinutes) {
      return NextResponse.json({ error: 'Date, activity type, and duration are required' }, { status: 400 });
    }

    // Get user's data for calorie calculation
    const userDoc = await adminDb.collection('users').doc(userId).get();
    const userData = userDoc.data();
    const groupId = userData?.circleId || null;
    const weightKg = userData?.weightLossProfile?.weightKg || userData?.currentWeight || 70; // Default to 70kg if not set

    // Calculate calories burned using the calculator module
    const caloriesBurned = estimateActivityCalories({
      activityType: activityType as ActivityType,
      durationMinutes,
      weightKg,
    });

    // Get display name for activity
    const displayName = activityName || ACTIVITY_DISPLAY_NAMES[activityType as ActivityType] || activityType;

    const now = new Date().toISOString();
    const entryId = uuidv4();

    const entry: DailyActivityEntry = {
      id: entryId,
      userId,
      groupId: groupId || undefined,
      date,
      activityType: activityType as ActivityType,
      activityName: displayName,
      durationMinutes,
      caloriesBurned,
      isPrivate,
      createdAt: now,
      updatedAt: now,
    };

    // Save to Firestore
    await adminDb.collection('activityEntries').doc(entryId).set(entry);

    // Update alignment for today (didLogWorkout)
    const alignmentId = `${userId}_${date}`;
    const alignmentRef = adminDb.collection('alignments').doc(alignmentId);
    await alignmentRef.set({
      userId,
      date,
      didLogWorkout: true,
      updatedAt: now,
    }, { merge: true });

    return NextResponse.json({ entry, success: true });
  } catch (error) {
    console.error('Error creating activity entry:', error);
    return NextResponse.json({ error: 'Failed to create activity entry' }, { status: 500 });
  }
}

