/**
 * Daily Alignment Service
 * 
 * Handles computing and updating daily alignment scores and streaks.
 * The alignment score is composed of four behaviors, each worth 25%:
 * 1. Morning check-in done
 * 2. Log meals for the day
 * 3. Log workout for the day
 * 4. Chat with your circle (send a message)
 */

import { adminDb } from './firebase-admin';
import { invalidateSquadCache } from './squad-alignment';
import type { UserAlignment, UserAlignmentSummary, AlignmentUpdatePayload } from '@/types';

/**
 * Get today's date in YYYY-MM-DD format
 * Uses the user's local date based on server time
 */
export function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Get yesterday's date in YYYY-MM-DD format
 */
export function getYesterdayDate(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split('T')[0];
}

/**
 * Check if a date string (YYYY-MM-DD) falls on a weekend
 */
function isWeekendDate(dateString: string): boolean {
  const date = new Date(dateString + 'T12:00:00'); // Use noon to avoid timezone issues
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday or Saturday
}

/**
 * Get the last weekday date (skipping Saturday and Sunday)
 * Used for streak calculation to bridge over weekends
 * e.g., On Monday, this returns Friday
 */
function getLastWeekdayDate(fromDate: string): string {
  const date = new Date(fromDate + 'T12:00:00');
  date.setDate(date.getDate() - 1); // Start with yesterday
  
  // Keep going back until we find a weekday
  while (isWeekendDate(date.toISOString().split('T')[0])) {
    date.setDate(date.getDate() - 1);
  }
  
  return date.toISOString().split('T')[0];
}

/**
 * Generate document ID for alignment: `${userId}_${date}`
 */
function getAlignmentDocId(userId: string, date: string): string {
  return `${userId}_${date}`;
}

/**
 * Calculate alignment score from the four boolean flags
 */
function calculateAlignmentScore(
  didMorningCheckin: boolean,
  didLogMeals: boolean,
  didLogWorkout: boolean,
  didInteractWithCircle: boolean
): number {
  let score = 0;
  if (didMorningCheckin) score += 25;
  if (didLogMeals) score += 25;
  if (didLogWorkout) score += 25;
  if (didInteractWithCircle) score += 25;
  return score;
}

/**
 * Check if user has an active goal
 */
async function checkUserHasActiveGoal(userId: string): Promise<boolean> {
  try {
    const userDoc = await adminDb.collection('users').doc(userId).get();
    if (!userDoc.exists) return false;
    
    const userData = userDoc.data();
    // User has an active goal if they have a weightGoal with title and targetDate set
    // and the goal hasn't been completed or archived
    return !!(userData?.weightGoal?.title && userData?.weightGoal?.targetDate && !userData?.goalCompleted);
  } catch (error) {
    console.error('[ALIGNMENT] Error checking active goal:', error);
    return false;
  }
}

/**
 * Check if user has logged meals for today
 * Checks the daily entry for meal logs
 */
async function checkUserHasLoggedMeals(userId: string, date: string): Promise<boolean> {
  try {
    // Check if there's a daily entry with meals logged
    const dailyEntryDoc = await adminDb
      .collection('dailyEntries')
      .doc(`${userId}_${date}`)
      .get();
    
    if (dailyEntryDoc.exists) {
      const data = dailyEntryDoc.data();
      // If daily entry has meals logged, return true
      if (data?.meals && data.meals.trim().length > 0) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('[ALIGNMENT] Error checking meals:', error);
    return false;
  }
}

/**
 * Check if user has logged workout for today
 * Checks the daily entry for workout logs
 */
async function checkUserHasLoggedWorkout(userId: string, date: string): Promise<boolean> {
  try {
    // Check if there's a daily entry with workout logged
    const dailyEntryDoc = await adminDb
      .collection('dailyEntries')
      .doc(`${userId}_${date}`)
      .get();
    
    if (dailyEntryDoc.exists) {
      const data = dailyEntryDoc.data();
      // If daily entry has workedOut true, return true
      if (data?.workedOut === true) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('[ALIGNMENT] Error checking workout:', error);
    return false;
  }
}

/**
 * Get user alignment for a specific date
 */
export async function getUserAlignment(
  userId: string,
  date: string = getTodayDate()
): Promise<UserAlignment | null> {
  try {
    const docId = getAlignmentDocId(userId, date);
    const docRef = adminDb.collection('userAlignment').doc(docId);
    const doc = await docRef.get();
    
    if (!doc.exists) return null;
    
    return { id: doc.id, ...doc.data() } as UserAlignment;
  } catch (error) {
    console.error('[ALIGNMENT] Error fetching alignment:', error);
    return null;
  }
}

/**
 * Get user alignment summary (streak info)
 */
export async function getUserAlignmentSummary(
  userId: string
): Promise<UserAlignmentSummary | null> {
  try {
    const docRef = adminDb.collection('userAlignmentSummary').doc(userId);
    const doc = await docRef.get();
    
    if (!doc.exists) return null;
    
    return doc.data() as UserAlignmentSummary;
  } catch (error) {
    console.error('[ALIGNMENT] Error fetching alignment summary:', error);
    return null;
  }
}

/**
 * Update alignment for today
 * This is the main function called when user actions occur
 */
export async function updateAlignmentForToday(
  userId: string,
  updates: AlignmentUpdatePayload
): Promise<UserAlignment | null> {
  const today = getTodayDate();
  const docId = getAlignmentDocId(userId, today);
  const docRef = adminDb.collection('userAlignment').doc(docId);
  const now = new Date().toISOString();

  try {
    // Fetch existing alignment doc or create new one
    const existingDoc = await docRef.get();
    let existingData: Partial<UserAlignment> = {};
    let wasFullyAlignedBefore = false;

    if (existingDoc.exists) {
      existingData = existingDoc.data() as UserAlignment;
      wasFullyAlignedBefore = existingData.fullyAligned || false;
    }

    // Merge updates with existing data
    // These flags are "sticky" - once true for a day, they stay true
    const didMorningCheckin = updates.didMorningCheckin || existingData.didMorningCheckin || false;
    const didInteractWithCircle = updates.didInteractWithCircle || existingData.didInteractWithCircle || false;
    
    // For didLogMeals: if already true, keep it true; otherwise check updates or current state
    let didLogMeals = existingData.didLogMeals || false;
    if (!didLogMeals) {
      didLogMeals = updates.didLogMeals ?? await checkUserHasLoggedMeals(userId, today);
    }
    
    // For didLogWorkout: if already true, keep it true; otherwise check updates or current state
    let didLogWorkout = existingData.didLogWorkout || false;
    if (!didLogWorkout) {
      didLogWorkout = updates.didLogWorkout ?? await checkUserHasLoggedWorkout(userId, today);
    }
    
    // Always recompute hasActiveGoal to ensure it's current
    const hasActiveGoal = await checkUserHasActiveGoal(userId);

    // Calculate score
    const alignmentScore = calculateAlignmentScore(
      didMorningCheckin,
      didLogMeals,
      didLogWorkout,
      didInteractWithCircle
    );
    const fullyAligned = alignmentScore === 100;

    // Get current streak info
    let streakOnThisDay = existingData.streakOnThisDay ?? 0;

    // If becoming fully aligned for the first time today, update streak
    if (fullyAligned && !wasFullyAlignedBefore) {
      streakOnThisDay = await updateStreak(userId, today);
    }

    // Prepare alignment data
    const alignmentData: Omit<UserAlignment, 'id'> = {
      userId,
      date: today,
      didMorningCheckin,
      didLogMeals,
      didLogWorkout,
      didInteractWithCircle,
      hasActiveGoal,
      alignmentScore,
      fullyAligned,
      streakOnThisDay,
      createdAt: existingData.createdAt || now,
      updatedAt: now,
    };

    // Save to Firestore
    await docRef.set(alignmentData, { merge: true });

    // Invalidate squad cache so squad view shows updated alignment instantly
    // This is fire-and-forget - we don't wait for it and don't fail if it errors
    invalidateUserSquadCache(userId).catch(err => {
      console.error('[ALIGNMENT] Failed to invalidate squad cache (will refresh via TTL):', err);
    });

    return { id: docId, ...alignmentData };
  } catch (error) {
    console.error('[ALIGNMENT] Error updating alignment:', error);
    return null;
  }
}

/**
 * Find user's squad and invalidate its cache
 * Called after alignment updates to ensure squad view shows fresh data
 */
async function invalidateUserSquadCache(userId: string): Promise<void> {
  // Find the user's squad membership
  const membershipSnapshot = await adminDb.collection('squadMembers')
    .where('userId', '==', userId)
    .limit(1)
    .get();

  if (membershipSnapshot.empty) {
    return; // User is not in a squad
  }

  const squadId = membershipSnapshot.docs[0].data().squadId;
  await invalidateSquadCache(squadId);
}

/**
 * Update the user's streak when they become fully aligned
 * Returns the new streak count
 * 
 * Weekend handling:
 * - If called on a weekend, returns current streak without modification (safety guard)
 * - When checking streak continuity, looks back to last weekday (skipping Sat/Sun)
 * - This ensures streaks bridge from Friday to Monday without breaking
 */
async function updateStreak(userId: string, today: string): Promise<number> {
  const summaryRef = adminDb.collection('userAlignmentSummary').doc(userId);
  const now = new Date().toISOString();

  try {
    // Safety guard: If somehow called on a weekend, don't modify streak
    if (isWeekendDate(today)) {
      const summaryDoc = await summaryRef.get();
      if (summaryDoc.exists) {
        return (summaryDoc.data() as UserAlignmentSummary).currentStreak || 0;
      }
      return 0;
    }

    const summaryDoc = await summaryRef.get();
    let currentStreak = 1;
    let lastAlignedDate: string | undefined;

    if (summaryDoc.exists) {
      const summaryData = summaryDoc.data() as UserAlignmentSummary;
      lastAlignedDate = summaryData.lastAlignedDate;

      // Check if last weekday was aligned - if so, increment streak
      // This skips weekends, so on Monday it checks Friday
      const lastWeekday = getLastWeekdayDate(today);
      if (lastAlignedDate === lastWeekday) {
        currentStreak = (summaryData.currentStreak || 0) + 1;
      } else if (lastAlignedDate === today) {
        // Already aligned today, don't increment (shouldn't happen but safety check)
        return summaryData.currentStreak || 1;
      } else {
        // Gap in alignment, reset streak
        currentStreak = 1;
      }
    }

    // Update summary
    const summaryUpdate: UserAlignmentSummary = {
      userId,
      currentStreak,
      lastAlignedDate: today,
      updatedAt: now,
    };

    await summaryRef.set(summaryUpdate, { merge: true });

    return currentStreak;
  } catch (error) {
    console.error('[ALIGNMENT] Error updating streak:', error);
    return 1;
  }
}

/**
 * Get full alignment state for client (alignment + summary)
 */
export async function getFullAlignmentState(
  userId: string,
  date: string = getTodayDate()
): Promise<{ alignment: UserAlignment | null; summary: UserAlignmentSummary | null }> {
  const [alignment, summary] = await Promise.all([
    getUserAlignment(userId, date),
    getUserAlignmentSummary(userId),
  ]);

  return { alignment, summary };
}

/**
 * Initialize alignment for today if it doesn't exist
 * This should be called when loading the homepage to ensure we have current state
 */
export async function initializeAlignmentForToday(userId: string): Promise<UserAlignment> {
  const today = getTodayDate();
  const existing = await getUserAlignment(userId, today);
  
  if (existing) {
    // Refresh hasActiveGoal as it can change (goal completed/archived)
    const hasActiveGoal = await checkUserHasActiveGoal(userId);
    
    // For didLogMeals: only check if currently false (it's "sticky" - once true, stays true)
    let didLogMeals = existing.didLogMeals;
    if (!didLogMeals) {
      didLogMeals = await checkUserHasLoggedMeals(userId, today);
    }
    
    // For didLogWorkout: only check if currently false (it's "sticky" - once true, stays true)
    let didLogWorkout = existing.didLogWorkout;
    if (!didLogWorkout) {
      didLogWorkout = await checkUserHasLoggedWorkout(userId, today);
    }
    
    // Only update if something changed
    if (existing.hasActiveGoal !== hasActiveGoal || existing.didLogMeals !== didLogMeals || existing.didLogWorkout !== didLogWorkout) {
      return (await updateAlignmentForToday(userId, { hasActiveGoal, didLogMeals, didLogWorkout }))!;
    }
    
    return existing;
  }

  // Create new alignment for today
  const alignment = await updateAlignmentForToday(userId, {});
  return alignment!;
}

