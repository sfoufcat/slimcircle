'use client';

import { useState } from 'react';
import { Plus, Utensils, ChevronRight, Trash2 } from 'lucide-react';
import { useIntake } from '@/hooks/useIntake';
import { formatCalories } from '@/lib/calories';
import { AddMealSheet } from './AddMealSheet';
import type { DailyIntakeEntry } from '@/types';

interface DailyIntakeSectionProps {
  onEntriesChange?: () => void;
}

export function DailyIntakeSection({ onEntriesChange }: DailyIntakeSectionProps) {
  const today = new Date().toISOString().split('T')[0];
  const {
    entries,
    totalCalories,
    isLoading,
    createEntry,
    deleteEntry,
  } = useIntake({ date: today });

  const [showAddSheet, setShowAddSheet] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<DailyIntakeEntry | null>(null);

  const handleAddMeal = async (data: {
    mealName: string;
    mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    ingredients: { name: string; grams: number; caloriesPer100g: number }[];
    isPrivate: boolean;
  }) => {
    const result = await createEntry(data);
    if (result) {
      setShowAddSheet(false);
      onEntriesChange?.();
    }
    return result !== null;
  };

  const handleDeleteEntry = async (id: string) => {
    const success = await deleteEntry(id);
    if (success) {
      setSelectedEntry(null);
      onEntriesChange?.();
    }
  };

  if (isLoading) {
    return (
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-albert text-[24px] text-text-primary leading-[1.3] tracking-[-1.5px]">
            Daily Intake
          </h2>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-text-primary" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="font-albert text-[24px] text-text-primary leading-[1.3] tracking-[-1.5px]">
              Daily Intake
            </h2>
            <span className="font-sans text-[14px] text-text-muted">
              {formatCalories(totalCalories)} kcal
            </span>
          </div>
          <button
            onClick={() => setShowAddSheet(true)}
            className="font-sans text-[12px] text-accent-secondary leading-[1.2] hover:text-accent-tertiary transition-colors flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            Add Meal
          </button>
        </div>

        {/* Entries List */}
        <div className="space-y-2">
          {entries.length === 0 ? (
            <button
              onClick={() => setShowAddSheet(true)}
              className="w-full bg-[#f3f1ef] dark:bg-[#11141b] rounded-[20px] p-4 flex items-center justify-center text-text-muted dark:text-[#7d8190] hover:text-text-secondary dark:hover:text-[#b2b6c2] transition-colors"
            >
              <span className="font-albert text-[18px] font-semibold tracking-[-1px] leading-[1.3] flex items-center gap-2">
                <Utensils className="w-5 h-5" />
                Log your first meal
              </span>
            </button>
          ) : (
            entries.map((entry) => (
              <div
                key={entry.id}
                className="w-full bg-white dark:bg-[#171b22] rounded-[20px] p-4 border border-[#e1ddd8] dark:border-[#262b35]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* Meal icon */}
                    <div className="w-10 h-10 rounded-full bg-[#faf8f6] dark:bg-[#1f242d] flex items-center justify-center flex-shrink-0">
                      <span className="text-[20px]">
                        {entry.mealType === 'breakfast' ? '🍳' : 
                         entry.mealType === 'lunch' ? '🥗' : 
                         entry.mealType === 'dinner' ? '🍽️' : '🍎'}
                      </span>
                    </div>
                    
                    {/* Meal details */}
                    <div className="flex-1 min-w-0">
                      <p className="font-albert text-[16px] font-semibold text-text-primary dark:text-[#f5f5f8] tracking-[-0.5px] truncate">
                        {entry.mealName}
                      </p>
                      <p className="font-sans text-[13px] text-text-muted dark:text-[#7d8190] truncate">
                        {entry.ingredients.length} ingredient{entry.ingredients.length !== 1 ? 's' : ''} • {entry.totalCalories} kcal
                      </p>
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDeleteEntry(entry.id)}
                      className="p-2 text-text-muted hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <ChevronRight className="w-5 h-5 text-text-muted" />
                  </div>
                </div>
                
                {/* Ingredients preview */}
                {entry.ingredients.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-[#e1ddd8] dark:border-[#262b35]">
                    <div className="flex flex-wrap gap-1.5">
                      {entry.ingredients.slice(0, 3).map((ing, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 bg-[#f3f1ef] dark:bg-[#1f242d] rounded-full font-sans text-[11px] text-text-muted dark:text-[#7d8190]"
                        >
                          {ing.name}
                        </span>
                      ))}
                      {entry.ingredients.length > 3 && (
                        <span className="px-2 py-0.5 font-sans text-[11px] text-text-muted">
                          +{entry.ingredients.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}

          {/* Add more meals button (if there are entries) */}
          {entries.length > 0 && (
            <button
              onClick={() => setShowAddSheet(true)}
              className="w-full bg-[#f3f1ef] dark:bg-[#11141b] rounded-[20px] p-4 flex items-center justify-center text-text-muted dark:text-[#7d8190] hover:text-text-secondary dark:hover:text-[#b2b6c2] transition-colors"
            >
              <span className="font-albert text-[16px] font-semibold tracking-[-0.5px] leading-[1.3] flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Add another meal
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Add Meal Sheet */}
      <AddMealSheet
        isOpen={showAddSheet}
        onClose={() => setShowAddSheet(false)}
        onSave={handleAddMeal}
      />
    </>
  );
}

