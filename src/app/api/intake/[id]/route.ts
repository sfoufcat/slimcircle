import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { v4 as uuidv4 } from 'uuid';
import type { MealIngredient, UpdateIntakeRequest } from '@/types';

/**
 * GET /api/intake/[id]
 * Fetch a single intake entry
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
    const doc = await adminDb.collection('intakeEntries').doc(id).get();

    if (!doc.exists) {
      return NextResponse.json({ error: 'Intake entry not found' }, { status: 404 });
    }

    const entry = { id: doc.id, ...doc.data() };

    // Verify ownership
    if (entry.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    return NextResponse.json({ entry });
  } catch (error) {
    console.error('Error fetching intake entry:', error);
    return NextResponse.json({ error: 'Failed to fetch intake entry' }, { status: 500 });
  }
}

/**
 * PATCH /api/intake/[id]
 * Update an intake entry
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
    const body: UpdateIntakeRequest = await request.json();
    
    const docRef = adminDb.collection('intakeEntries').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.json({ error: 'Intake entry not found' }, { status: 404 });
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

    if (body.mealName !== undefined) updates.mealName = body.mealName;
    if (body.mealType !== undefined) updates.mealType = body.mealType;
    if (body.isPrivate !== undefined) updates.isPrivate = body.isPrivate;

    // If ingredients are updated, recalculate calories
    if (body.ingredients !== undefined) {
      const finalIngredients: MealIngredient[] = body.ingredients.map(ing => ({
        id: uuidv4(),
        name: ing.name,
        grams: ing.grams,
        caloriesPer100g: ing.caloriesPer100g,
        calories: Math.round((ing.grams / 100) * ing.caloriesPer100g),
      }));
      
      updates.ingredients = finalIngredients;
      updates.totalCalories = finalIngredients.reduce((sum, ing) => sum + ing.calories, 0);
    }

    await docRef.update(updates);

    const updatedDoc = await docRef.get();
    const entry = { id: updatedDoc.id, ...updatedDoc.data() };

    return NextResponse.json({ entry, success: true });
  } catch (error) {
    console.error('Error updating intake entry:', error);
    return NextResponse.json({ error: 'Failed to update intake entry' }, { status: 500 });
  }
}

/**
 * DELETE /api/intake/[id]
 * Delete an intake entry
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
    const docRef = adminDb.collection('intakeEntries').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.json({ error: 'Intake entry not found' }, { status: 404 });
    }

    const entry = doc.data();

    // Verify ownership
    if (entry?.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await docRef.delete();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting intake entry:', error);
    return NextResponse.json({ error: 'Failed to delete intake entry' }, { status: 500 });
  }
}

