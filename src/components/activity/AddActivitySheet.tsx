'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Flame, Clock } from 'lucide-react';
import { getActivityTypes, ACTIVITY_DISPLAY_NAMES } from '@/lib/calories';
import type { ActivityType } from '@/types';

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

// Duration presets
const DURATION_PRESETS = [15, 30, 45, 60, 90];

interface AddActivitySheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    activityType: ActivityType;
    activityName?: string;
    durationMinutes: number;
    isPrivate: boolean;
  }) => Promise<boolean>;
}

export function AddActivitySheet({ isOpen, onClose, onSave }: AddActivitySheetProps) {
  const [activityType, setActivityType] = useState<ActivityType>('walking');
  const [customName, setCustomName] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [isPrivate, setIsPrivate] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const activityTypes = getActivityTypes();

  const handleSave = async () => {
    if (!activityType || durationMinutes <= 0) return;
    
    setIsSaving(true);
    const success = await onSave({
      activityType,
      activityName: customName || undefined,
      durationMinutes,
      isPrivate,
    });
    
    if (success) {
      // Reset form
      setActivityType('walking');
      setCustomName('');
      setDurationMinutes(30);
      setIsPrivate(false);
    }
    setIsSaving(false);
  };

  const handleClose = () => {
    if (!isSaving) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/50 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
          />

          {/* Sheet */}
          <motion.div
            className="fixed inset-x-0 bottom-0 z-50 bg-white dark:bg-[#171b22] rounded-t-[24px] max-h-[90vh] overflow-y-auto"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            {/* Handle */}
            <div className="sticky top-0 bg-white dark:bg-[#171b22] pt-3 pb-2 px-6 border-b border-[#e1ddd8] dark:border-[#262b35]">
              <div className="w-10 h-1 bg-[#e1ddd8] dark:bg-[#3d4654] rounded-full mx-auto mb-4" />
              <div className="flex items-center justify-between">
                <h2 className="font-albert text-[24px] font-semibold text-text-primary dark:text-[#f5f5f8] tracking-[-1px]">
                  Add Activity
                </h2>
                <button
                  onClick={handleClose}
                  className="p-2 text-text-muted hover:text-text-primary transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Activity Type Selection */}
              <div>
                <label className="block font-sans text-[14px] font-medium text-text-secondary dark:text-[#b2b6c2] mb-3">
                  Activity Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {activityTypes.map((type) => (
                    <button
                      key={type.value}
                      onClick={() => setActivityType(type.value)}
                      className={`py-3 px-2 rounded-[12px] font-sans text-[12px] font-medium transition-all ${
                        activityType === type.value
                          ? 'bg-[#22c55e] text-white'
                          : 'bg-[#f3f1ef] dark:bg-[#1f242d] text-text-secondary dark:text-[#b2b6c2] hover:bg-[#e8e4df]'
                      }`}
                    >
                      <span className="block text-[20px] mb-1">
                        {ACTIVITY_EMOJIS[type.value] || '🏅'}
                      </span>
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Name (optional) */}
              <div>
                <label className="block font-sans text-[14px] font-medium text-text-secondary dark:text-[#b2b6c2] mb-2">
                  Custom Name <span className="text-text-muted">(optional)</span>
                </label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder={`e.g., Morning ${ACTIVITY_DISPLAY_NAMES[activityType]}`}
                  className="w-full py-3 px-4 rounded-[12px] border border-[#e1ddd8] dark:border-[#3d4654] bg-white dark:bg-[#1f242d] font-sans text-[16px] text-text-primary dark:text-[#f5f5f8] placeholder:text-text-muted focus:border-[#22c55e] focus:outline-none transition-colors"
                />
              </div>

              {/* Duration */}
              <div>
                <label className="block font-sans text-[14px] font-medium text-text-secondary dark:text-[#b2b6c2] mb-3">
                  <Clock className="w-4 h-4 inline mr-1" />
                  Duration
                </label>
                
                {/* Preset buttons */}
                <div className="flex gap-2 mb-3">
                  {DURATION_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      onClick={() => setDurationMinutes(preset)}
                      className={`flex-1 py-2 rounded-[10px] font-sans text-[14px] font-medium transition-all ${
                        durationMinutes === preset
                          ? 'bg-[#22c55e] text-white'
                          : 'bg-[#f3f1ef] dark:bg-[#1f242d] text-text-secondary dark:text-[#b2b6c2] hover:bg-[#e8e4df]'
                      }`}
                    >
                      {preset}m
                    </button>
                  ))}
                </div>

                {/* Custom duration input */}
                <div className="relative">
                  <input
                    type="number"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Math.max(1, parseInt(e.target.value) || 0))}
                    min="1"
                    max="480"
                    className="w-full py-3 px-4 pr-16 rounded-[12px] border border-[#e1ddd8] dark:border-[#3d4654] bg-white dark:bg-[#1f242d] font-sans text-[16px] text-text-primary dark:text-[#f5f5f8] focus:border-[#22c55e] focus:outline-none transition-colors"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 font-sans text-[14px] text-text-muted">
                    minutes
                  </span>
                </div>
              </div>

              {/* Calories estimate preview */}
              <div className="bg-[#ecfdf5] dark:bg-[#052e16] rounded-[14px] p-4">
                <div className="flex items-center gap-2 text-[#22c55e]">
                  <Flame className="w-5 h-5" />
                  <span className="font-sans text-[14px] font-medium">
                    Estimated calories burned will be calculated based on your weight
                  </span>
                </div>
              </div>

              {/* Privacy Toggle */}
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="font-sans text-[14px] font-medium text-text-primary dark:text-[#f5f5f8]">
                    Keep this activity private
                  </p>
                  <p className="font-sans text-[12px] text-text-muted">
                    Private activities won&apos;t be visible to your circle
                  </p>
                </div>
                <button
                  onClick={() => setIsPrivate(!isPrivate)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    isPrivate ? 'bg-[#22c55e]' : 'bg-[#e1ddd8] dark:bg-[#3d4654]'
                  }`}
                >
                  <div
                    className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                      isPrivate ? 'left-6' : 'left-0.5'
                    }`}
                  />
                </button>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2 pb-4">
                <button
                  onClick={handleClose}
                  disabled={isSaving}
                  className="flex-1 py-4 rounded-[16px] font-sans text-[16px] font-semibold bg-[#f3f1ef] dark:bg-[#1f242d] text-text-primary dark:text-[#f5f5f8] hover:bg-[#e8e4df] dark:hover:bg-[#262b35] transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={durationMinutes <= 0 || isSaving}
                  className="flex-1 py-4 rounded-[16px] font-sans text-[16px] font-semibold bg-[#22c55e] text-white hover:bg-[#16a34a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSaving ? 'Saving...' : 'Log Activity'}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

