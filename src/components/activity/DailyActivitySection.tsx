'use client';

import { useState } from 'react';
import { Plus, Flame, ChevronRight, Trash2 } from 'lucide-react';
import { useActivity } from '@/hooks/useActivity';
import { formatCalories, ACTIVITY_DISPLAY_NAMES } from '@/lib/calories';
import { AddActivitySheet } from './AddActivitySheet';
import type { DailyActivityEntry, ActivityType } from '@/types';

// Activity type emojis
const ACTIVITY_EMOJIS: Record<ActivityType, string> = {
  walking: '🚶',
  running: '🏃',
  cycling: '🚴',
  swimming: '🏊',
  strength_training: '🏋️',
  pilates: '🧘',
  yoga: '🧘',
  hiit: '💪',
  dancing: '💃',
  hiking: '🥾',
  sports: '⚽',
  other: '🏅',
};

interface DailyActivitySectionProps {
  onEntriesChange?: () => void;
}

export function DailyActivitySection({ onEntriesChange }: DailyActivitySectionProps) {
  const today = new Date().toISOString().split('T')[0];
  const {
    entries,
    totalCaloriesBurned,
    isLoading,
    createEntry,
    deleteEntry,
  } = useActivity({ date: today });

  const [showAddSheet, setShowAddSheet] = useState(false);

  const handleAddActivity = async (data: {
    activityType: ActivityType;
    activityName?: string;
    durationMinutes: number;
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
      onEntriesChange?.();
    }
  };

  if (isLoading) {
    return (
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-albert text-[24px] text-text-primary leading-[1.3] tracking-[-1.5px]">
            Daily Activity
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
              Daily Activity
            </h2>
            <span className="font-sans text-[14px] text-[#22c55e] flex items-center gap-1">
              <Flame className="w-4 h-4" />
              {formatCalories(totalCaloriesBurned)} kcal
            </span>
          </div>
          <button
            onClick={() => setShowAddSheet(true)}
            className="font-sans text-[12px] text-accent-secondary leading-[1.2] hover:text-accent-tertiary transition-colors flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            Add Activity
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
                <Flame className="w-5 h-5" />
                Log your first activity
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
                    {/* Activity icon */}
                    <div className="w-10 h-10 rounded-full bg-[#ecfdf5] dark:bg-[#052e16] flex items-center justify-center flex-shrink-0">
                      <span className="text-[20px]">
                        {ACTIVITY_EMOJIS[entry.activityType] || '🏅'}
                      </span>
                    </div>
                    
                    {/* Activity details */}
                    <div className="flex-1 min-w-0">
                      <p className="font-albert text-[16px] font-semibold text-text-primary dark:text-[#f5f5f8] tracking-[-0.5px] truncate">
                        {entry.activityName || ACTIVITY_DISPLAY_NAMES[entry.activityType]}
                      </p>
                      <p className="font-sans text-[13px] text-text-muted dark:text-[#7d8190]">
                        {entry.durationMinutes} min • <span className="text-[#22c55e]">{entry.caloriesBurned} kcal burned</span>
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
              </div>
            ))
          )}

          {/* Add more activities button (if there are entries) */}
          {entries.length > 0 && (
            <button
              onClick={() => setShowAddSheet(true)}
              className="w-full bg-[#f3f1ef] dark:bg-[#11141b] rounded-[20px] p-4 flex items-center justify-center text-text-muted dark:text-[#7d8190] hover:text-text-secondary dark:hover:text-[#b2b6c2] transition-colors"
            >
              <span className="font-albert text-[16px] font-semibold tracking-[-0.5px] leading-[1.3] flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Add another activity
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Add Activity Sheet */}
      <AddActivitySheet
        isOpen={showAddSheet}
        onClose={() => setShowAddSheet(false)}
        onSave={handleAddActivity}
      />
    </>
  );
}

