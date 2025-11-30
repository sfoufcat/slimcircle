'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, Calculator, Search, Loader2, Database } from 'lucide-react';
import type { MealType } from '@/types';
import { calculateMealCalories } from '@/hooks/useIntake';
import { useFoodSearch } from '@/hooks/useFoodSearch';
import type { FoodSearchResult } from '@/lib/food-search';

const MEAL_TYPES: { value: MealType; label: string; emoji: string }[] = [
  { value: 'breakfast', label: 'Breakfast', emoji: '🍳' },
  { value: 'lunch', label: 'Lunch', emoji: '🥗' },
  { value: 'dinner', label: 'Dinner', emoji: '🍽️' },
  { value: 'snack', label: 'Snack', emoji: '🍎' },
];

// Fallback common foods when API is unavailable
const FALLBACK_FOODS = [
  { name: 'Chicken Breast', caloriesPer100g: 165 },
  { name: 'Rice (cooked)', caloriesPer100g: 130 },
  { name: 'Eggs', caloriesPer100g: 155 },
  { name: 'Salmon', caloriesPer100g: 208 },
  { name: 'Broccoli', caloriesPer100g: 34 },
  { name: 'Banana', caloriesPer100g: 89 },
  { name: 'Apple', caloriesPer100g: 52 },
  { name: 'Bread (whole wheat)', caloriesPer100g: 247 },
];

interface Ingredient {
  name: string;
  grams: number;
  caloriesPer100g: number;
}

interface AddMealSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    mealName: string;
    mealType?: MealType;
    ingredients: Ingredient[];
    isPrivate: boolean;
  }) => Promise<boolean>;
}

export function AddMealSheet({ isOpen, onClose, onSave }: AddMealSheetProps) {
  const [mealName, setMealName] = useState('');
  const [mealType, setMealType] = useState<MealType>('lunch');
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [isPrivate, setIsPrivate] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // New ingredient form
  const [newIngName, setNewIngName] = useState('');
  const [newIngGrams, setNewIngGrams] = useState('');
  const [newIngCalories, setNewIngCalories] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Food search hook
  const { results: searchResults, isLoading: searchLoading, search, clearResults } = useFoodSearch({
    debounceMs: 300,
    minQueryLength: 2,
    limit: 12,
  });

  const totalCalories = calculateMealCalories(ingredients);

  // Handle clicks outside dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search when ingredient name changes
  useEffect(() => {
    if (newIngName.length >= 2 && !manualMode) {
      search(newIngName);
      setShowDropdown(true);
    } else {
      clearResults();
      setShowDropdown(false);
    }
  }, [newIngName, manualMode, search, clearResults]);

  const handleAddIngredient = () => {
    if (!newIngName || !newIngGrams || !newIngCalories) return;
    
    setIngredients([
      ...ingredients,
      {
        name: newIngName,
        grams: parseFloat(newIngGrams),
        caloriesPer100g: parseFloat(newIngCalories),
      },
    ]);
    
    // Reset form
    setNewIngName('');
    setNewIngGrams('');
    setNewIngCalories('');
    setShowDropdown(false);
    setManualMode(false);
    clearResults();
  };

  const handleSelectFood = (food: FoodSearchResult | { name: string; caloriesPer100g: number }) => {
    setNewIngName(food.name);
    setNewIngCalories(food.caloriesPer100g.toString());
    setShowDropdown(false);
    setManualMode(false);
    clearResults();
    // Focus on grams input after selection
    setTimeout(() => {
      const gramsInput = document.querySelector('input[placeholder="Amount"]') as HTMLInputElement;
      gramsInput?.focus();
    }, 50);
  };

  const handleRemoveIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!mealName || ingredients.length === 0) return;
    
    setIsSaving(true);
    const success = await onSave({
      mealName,
      mealType,
      ingredients,
      isPrivate,
    });
    
    if (success) {
      // Reset form
      setMealName('');
      setMealType('lunch');
      setIngredients([]);
      setIsPrivate(false);
      setNewIngName('');
      setNewIngGrams('');
      setNewIngCalories('');
    }
    setIsSaving(false);
  };

  const handleClose = () => {
    if (!isSaving) {
      onClose();
    }
  };

  // Determine what to show in dropdown
  const showSearchResults = searchResults.length > 0;
  const showFallback = !showSearchResults && newIngName.length >= 2 && !searchLoading;
  const filteredFallback = FALLBACK_FOODS.filter(f => 
    f.name.toLowerCase().includes(newIngName.toLowerCase())
  );

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
            <div className="sticky top-0 bg-white dark:bg-[#171b22] pt-3 pb-2 px-6 border-b border-[#e1ddd8] dark:border-[#262b35] z-10">
              <div className="w-10 h-1 bg-[#e1ddd8] dark:bg-[#3d4654] rounded-full mx-auto mb-4" />
              <div className="flex items-center justify-between">
                <h2 className="font-albert text-[24px] font-semibold text-text-primary dark:text-[#f5f5f8] tracking-[-1px]">
                  Add Meal
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
              {/* Meal Type Selection */}
              <div>
                <label className="block font-sans text-[14px] font-medium text-text-secondary dark:text-[#b2b6c2] mb-2">
                  Meal Type
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {MEAL_TYPES.map((type) => (
                    <button
                      key={type.value}
                      onClick={() => setMealType(type.value)}
                      className={`py-3 px-2 rounded-[12px] font-sans text-[13px] font-medium transition-all ${
                        mealType === type.value
                          ? 'bg-[#a07855] text-white'
                          : 'bg-[#f3f1ef] dark:bg-[#1f242d] text-text-secondary dark:text-[#b2b6c2] hover:bg-[#e8e4df]'
                      }`}
                    >
                      <span className="block text-[18px] mb-1">{type.emoji}</span>
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Meal Name */}
              <div>
                <label className="block font-sans text-[14px] font-medium text-text-secondary dark:text-[#b2b6c2] mb-2">
                  Meal Name
                </label>
                <input
                  type="text"
                  value={mealName}
                  onChange={(e) => setMealName(e.target.value)}
                  placeholder="e.g., Grilled Chicken Salad"
                  className="w-full py-3 px-4 rounded-[12px] border border-[#e1ddd8] dark:border-[#3d4654] bg-white dark:bg-[#1f242d] font-sans text-[16px] text-text-primary dark:text-[#f5f5f8] placeholder:text-text-muted focus:border-[#a07855] focus:outline-none transition-colors"
                />
              </div>

              {/* Ingredients */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="font-sans text-[14px] font-medium text-text-secondary dark:text-[#b2b6c2]">
                    Ingredients
                  </label>
                  <div className="flex items-center gap-1 text-[#a07855]">
                    <Calculator className="w-4 h-4" />
                    <span className="font-sans text-[14px] font-semibold">
                      {totalCalories} kcal
                    </span>
                  </div>
                </div>

                {/* Added ingredients */}
                {ingredients.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {ingredients.map((ing, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between py-2 px-3 bg-[#f3f1ef] dark:bg-[#1f242d] rounded-[10px]"
                      >
                        <div>
                          <p className="font-sans text-[14px] font-medium text-text-primary dark:text-[#f5f5f8]">
                            {ing.name}
                          </p>
                          <p className="font-sans text-[12px] text-text-muted">
                            {ing.grams}g • {Math.round((ing.grams / 100) * ing.caloriesPer100g)} kcal
                          </p>
                        </div>
                        <button
                          onClick={() => handleRemoveIngredient(idx)}
                          className="p-1 text-text-muted hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add ingredient form */}
                <div className="space-y-3 p-4 bg-[#faf8f6] dark:bg-[#11141b] rounded-[14px] border border-[#e1ddd8] dark:border-[#262b35]">
                  {/* Food search input */}
                  <div className="relative" ref={dropdownRef}>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                      <input
                        ref={inputRef}
                        type="text"
                        value={newIngName}
                        onChange={(e) => {
                          setNewIngName(e.target.value);
                          setManualMode(false);
                        }}
                        onFocus={() => {
                          if (newIngName.length >= 2) setShowDropdown(true);
                        }}
                        placeholder="Search food database..."
                        className="w-full py-2.5 pl-9 pr-3 rounded-[10px] border border-[#e1ddd8] dark:border-[#3d4654] bg-white dark:bg-[#1f242d] font-sans text-[14px] text-text-primary dark:text-[#f5f5f8] placeholder:text-text-muted focus:border-[#a07855] focus:outline-none transition-colors"
                      />
                      {searchLoading && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted animate-spin" />
                      )}
                    </div>
                    
                    {/* Search results dropdown */}
                    {showDropdown && (showSearchResults || showFallback || searchLoading) && (
                      <div className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto bg-white dark:bg-[#1f242d] border border-[#e1ddd8] dark:border-[#3d4654] rounded-[10px] shadow-lg">
                        {searchLoading && (
                          <div className="px-3 py-4 text-center">
                            <Loader2 className="w-5 h-5 text-text-muted animate-spin mx-auto mb-2" />
                            <p className="font-sans text-[12px] text-text-muted">
                              Searching food databases...
                            </p>
                          </div>
                        )}
                        
                        {!searchLoading && showSearchResults && (
                          <>
                            <div className="px-3 py-2 border-b border-[#e1ddd8] dark:border-[#262b35] flex items-center gap-2">
                              <Database className="w-3.5 h-3.5 text-[#a07855]" />
                              <span className="font-sans text-[11px] text-text-muted uppercase tracking-wide">
                                {searchResults.length} results from USDA & Open Food Facts
                              </span>
                            </div>
                            {searchResults.map((food) => (
                              <button
                                key={food.id}
                                onClick={() => handleSelectFood(food)}
                                className="w-full px-3 py-2.5 text-left hover:bg-[#f3f1ef] dark:hover:bg-[#262b35] transition-colors border-b border-[#f3f1ef] dark:border-[#262b35] last:border-0"
                              >
                                <div className="flex justify-between items-start gap-2">
                                  <div className="flex-1 min-w-0">
                                    <p className="font-sans text-[14px] text-text-primary dark:text-[#f5f5f8] truncate">
                                      {food.name}
                                    </p>
                                    {food.brand && (
                                      <p className="font-sans text-[11px] text-text-muted truncate">
                                        {food.brand}
                                      </p>
                                    )}
                                  </div>
                                  <div className="text-right shrink-0">
                                    <span className="font-sans text-[13px] font-semibold text-[#a07855]">
                                      {food.caloriesPer100g}
                                    </span>
                                    <span className="font-sans text-[11px] text-text-muted ml-0.5">
                                      kcal/100g
                                    </span>
                                  </div>
                                </div>
                                {(food.protein || food.carbs || food.fat) && (
                                  <div className="flex gap-3 mt-1">
                                    {food.protein && (
                                      <span className="font-sans text-[10px] text-text-muted">
                                        P: {food.protein}g
                                      </span>
                                    )}
                                    {food.carbs && (
                                      <span className="font-sans text-[10px] text-text-muted">
                                        C: {food.carbs}g
                                      </span>
                                    )}
                                    {food.fat && (
                                      <span className="font-sans text-[10px] text-text-muted">
                                        F: {food.fat}g
                                      </span>
                                    )}
                                  </div>
                                )}
                              </button>
                            ))}
                          </>
                        )}

                        {!searchLoading && showFallback && filteredFallback.length > 0 && (
                          <>
                            <p className="px-3 py-2 font-sans text-[11px] text-text-muted uppercase tracking-wide border-b border-[#e1ddd8] dark:border-[#262b35]">
                              Common foods
                            </p>
                            {filteredFallback.map((food, idx) => (
                              <button
                                key={idx}
                                onClick={() => handleSelectFood(food)}
                                className="w-full px-3 py-2 text-left font-sans text-[14px] text-text-primary dark:text-[#f5f5f8] hover:bg-[#f3f1ef] dark:hover:bg-[#262b35] transition-colors"
                              >
                                {food.name}
                                <span className="text-text-muted text-[12px] ml-2">
                                  {food.caloriesPer100g} kcal/100g
                                </span>
                              </button>
                            ))}
                          </>
                        )}

                        {/* Manual entry option */}
                        <button
                          onClick={() => {
                            setManualMode(true);
                            setShowDropdown(false);
                          }}
                          className="w-full px-3 py-2.5 text-left font-sans text-[13px] text-[#a07855] hover:bg-[#f3f1ef] dark:hover:bg-[#262b35] transition-colors border-t border-[#e1ddd8] dark:border-[#262b35]"
                        >
                          <Plus className="w-3.5 h-3.5 inline mr-1.5" />
                          Enter &quot;{newIngName}&quot; manually with custom calories
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Manual mode indicator */}
                  {manualMode && (
                    <p className="font-sans text-[12px] text-[#a07855]">
                      Manual entry mode — enter calories per 100g below
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div className="relative">
                      <input
                        type="number"
                        value={newIngGrams}
                        onChange={(e) => setNewIngGrams(e.target.value)}
                        placeholder="Amount"
                        min="1"
                        className="w-full py-2.5 px-3 pr-8 rounded-[10px] border border-[#e1ddd8] dark:border-[#3d4654] bg-white dark:bg-[#1f242d] font-sans text-[14px] text-text-primary dark:text-[#f5f5f8] placeholder:text-text-muted focus:border-[#a07855] focus:outline-none transition-colors"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 font-sans text-[12px] text-text-muted">
                        g
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        value={newIngCalories}
                        onChange={(e) => setNewIngCalories(e.target.value)}
                        placeholder="Calories"
                        min="0"
                        className="w-full py-2.5 px-3 pr-16 rounded-[10px] border border-[#e1ddd8] dark:border-[#3d4654] bg-white dark:bg-[#1f242d] font-sans text-[14px] text-text-primary dark:text-[#f5f5f8] placeholder:text-text-muted focus:border-[#a07855] focus:outline-none transition-colors"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 font-sans text-[12px] text-text-muted">
                        /100g
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={handleAddIngredient}
                    disabled={!newIngName || !newIngGrams || !newIngCalories}
                    className="w-full py-2.5 rounded-[10px] font-sans text-[14px] font-medium bg-[#e8e4df] dark:bg-[#262b35] text-text-primary dark:text-[#f5f5f8] hover:bg-[#ddd8d2] dark:hover:bg-[#3d4654] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Ingredient
                  </button>
                </div>
              </div>

              {/* Privacy Toggle */}
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="font-sans text-[14px] font-medium text-text-primary dark:text-[#f5f5f8]">
                    Keep this meal private
                  </p>
                  <p className="font-sans text-[12px] text-text-muted">
                    Private meals won&apos;t be visible to your circle
                  </p>
                </div>
                <button
                  onClick={() => setIsPrivate(!isPrivate)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    isPrivate ? 'bg-[#a07855]' : 'bg-[#e1ddd8] dark:bg-[#3d4654]'
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
                  disabled={!mealName || ingredients.length === 0 || isSaving}
                  className="flex-1 py-4 rounded-[16px] font-sans text-[16px] font-semibold bg-[#a07855] text-white hover:bg-[#8a6649] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSaving ? 'Saving...' : 'Save Meal'}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
