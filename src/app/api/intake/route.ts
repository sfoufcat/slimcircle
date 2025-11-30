import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { v4 as uuidv4 } from 'uuid';
import type { DailyIntakeEntry, MealIngredient, CreateIntakeRequest } from '@/types';

/**
 * GET /api/intake
 * Fetch intake entries for a specific date
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

    // Fetch intake entries for this user and date
    const intakeSnapshot = await adminDb
      .collection('intakeEntries')
      .where('userId', '==', userId)
      .where('date', '==', date)
      .orderBy('createdAt', 'desc')
      .get();

    const entries: DailyIntakeEntry[] = intakeSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as DailyIntakeEntry));

    // Calculate total calories for the day
    const totalCalories = entries.reduce((sum, entry) => sum + entry.totalCalories, 0);

    return NextResponse.json({
      entries,
      totalCalories,
      date,
    });
  } catch (error) {
    console.error('Error fetching intake entries:', error);
    return NextResponse.json({ error: 'Failed to fetch intake entries' }, { status: 500 });
  }
}

/**
 * POST /api/intake
 * Create a new intake entry (meal)
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: CreateIntakeRequest = await request.json();
    const { date, mealName, mealType, ingredients, isPrivate = false, savedMealId } = body;

    if (!date || !mealName) {
      return NextResponse.json({ error: 'Date and meal name are required' }, { status: 400 });
    }

    // Get user's circle ID for visibility
    const userDoc = await adminDb.collection('users').doc(userId).get();
    const userData = userDoc.data();
    const groupId = userData?.circleId || null;

    // If using a saved meal, fetch its ingredients
    let finalIngredients: MealIngredient[] = [];
    
    if (savedMealId) {
      const savedMealDoc = await adminDb.collection('savedMeals').doc(savedMealId).get();
      if (savedMealDoc.exists) {
        const savedMeal = savedMealDoc.data();
        finalIngredients = savedMeal?.ingredients || [];
      }
    } else if (ingredients && ingredients.length > 0) {
      // Calculate calories for each ingredient
      finalIngredients = ingredients.map(ing => ({
        id: uuidv4(),
        name: ing.name,
        grams: ing.grams,
        caloriesPer100g: ing.caloriesPer100g,
        calories: Math.round((ing.grams / 100) * ing.caloriesPer100g),
      }));
    }

    // Calculate total calories
    const totalCalories = finalIngredients.reduce((sum, ing) => sum + ing.calories, 0);

    const now = new Date().toISOString();
    const entryId = uuidv4();

    const entry: DailyIntakeEntry = {
      id: entryId,
      userId,
      groupId: groupId || undefined,
      date,
      mealName,
      mealType,
      ingredients: finalIngredients,
      totalCalories,
      isPrivate,
      createdAt: now,
      updatedAt: now,
    };

    // Save to Firestore
    await adminDb.collection('intakeEntries').doc(entryId).set(entry);

    // Update alignment for today (didLogMeals)
    const alignmentId = `${userId}_${date}`;
    const alignmentRef = adminDb.collection('alignments').doc(alignmentId);
    await alignmentRef.set({
      userId,
      date,
      didLogMeals: true,
      updatedAt: now,
    }, { merge: true });

    return NextResponse.json({ entry, success: true });
  } catch (error) {
    console.error('Error creating intake entry:', error);
    return NextResponse.json({ error: 'Failed to create intake entry' }, { status: 500 });
  }
}
