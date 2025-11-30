/**
 * Food Search Library
 * 
 * Integrates USDA FoodData Central and Open Food Facts APIs
 * to provide comprehensive food search with nutrition data.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface FoodSearchResult {
  id: string;
  name: string;
  brand?: string;
  caloriesPer100g: number;
  source: 'usda' | 'openfoodfacts';
  // Additional nutrition data (per 100g)
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  servingSize?: string;
}

export interface FoodSearchOptions {
  limit?: number;
  includeUSDA?: boolean;
  includeOpenFoodFacts?: boolean;
}

// ============================================================================
// USDA FoodData Central API
// ============================================================================

interface USDAFood {
  fdcId: number;
  description: string;
  brandOwner?: string;
  brandName?: string;
  foodNutrients: Array<{
    nutrientId: number;
    nutrientName: string;
    value: number;
    unitName: string;
  }>;
  servingSize?: number;
  servingSizeUnit?: string;
}

interface USDASearchResponse {
  foods: USDAFood[];
  totalHits: number;
}

// USDA Nutrient IDs
const USDA_NUTRIENT_IDS = {
  ENERGY: 1008, // Calories (kcal)
  PROTEIN: 1003,
  FAT: 1004,
  CARBS: 1005,
  FIBER: 1079,
};

/**
 * Search USDA FoodData Central
 */
export async function searchUSDA(
  query: string,
  apiKey: string,
  limit: number = 10
): Promise<FoodSearchResult[]> {
  if (!apiKey) {
    console.warn('USDA API key not provided, skipping USDA search');
    return [];
  }

  try {
    const url = new URL('https://api.nal.usda.gov/fdc/v1/foods/search');
    url.searchParams.set('api_key', apiKey);
    url.searchParams.set('query', query);
    url.searchParams.set('pageSize', limit.toString());
    url.searchParams.set('dataType', 'Foundation,SR Legacy,Branded');

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('USDA API error:', response.status, response.statusText);
      return [];
    }

    const data: USDASearchResponse = await response.json();

    return data.foods
      .map((food): FoodSearchResult | null => {
        // Extract nutrients
        const calories = food.foodNutrients.find(n => n.nutrientId === USDA_NUTRIENT_IDS.ENERGY)?.value;
        
        // Skip foods without calorie data
        if (!calories && calories !== 0) return null;

        const protein = food.foodNutrients.find(n => n.nutrientId === USDA_NUTRIENT_IDS.PROTEIN)?.value;
        const fat = food.foodNutrients.find(n => n.nutrientId === USDA_NUTRIENT_IDS.FAT)?.value;
        const carbs = food.foodNutrients.find(n => n.nutrientId === USDA_NUTRIENT_IDS.CARBS)?.value;
        const fiber = food.foodNutrients.find(n => n.nutrientId === USDA_NUTRIENT_IDS.FIBER)?.value;

        return {
          id: `usda_${food.fdcId}`,
          name: cleanFoodName(food.description),
          brand: food.brandOwner || food.brandName,
          caloriesPer100g: Math.round(calories),
          source: 'usda',
          protein: protein ? Math.round(protein * 10) / 10 : undefined,
          fat: fat ? Math.round(fat * 10) / 10 : undefined,
          carbs: carbs ? Math.round(carbs * 10) / 10 : undefined,
          fiber: fiber ? Math.round(fiber * 10) / 10 : undefined,
          servingSize: food.servingSize && food.servingSizeUnit 
            ? `${food.servingSize}${food.servingSizeUnit}`
            : undefined,
        };
      })
      .filter((food): food is FoodSearchResult => food !== null);
  } catch (error) {
    console.error('Error searching USDA:', error);
    return [];
  }
}

// ============================================================================
// Open Food Facts API
// ============================================================================

interface OpenFoodFactsProduct {
  _id: string;
  product_name?: string;
  product_name_en?: string;
  brands?: string;
  nutriments?: {
    'energy-kcal_100g'?: number;
    'energy-kcal'?: number;
    proteins_100g?: number;
    fat_100g?: number;
    carbohydrates_100g?: number;
    fiber_100g?: number;
  };
  serving_size?: string;
}

interface OpenFoodFactsSearchResponse {
  products: OpenFoodFactsProduct[];
  count: number;
}

/**
 * Search Open Food Facts
 */
export async function searchOpenFoodFacts(
  query: string,
  limit: number = 10
): Promise<FoodSearchResult[]> {
  try {
    const url = new URL('https://world.openfoodfacts.org/cgi/search.pl');
    url.searchParams.set('search_terms', query);
    url.searchParams.set('search_simple', '1');
    url.searchParams.set('action', 'process');
    url.searchParams.set('json', '1');
    url.searchParams.set('page_size', limit.toString());
    url.searchParams.set('fields', 'product_name,product_name_en,brands,nutriments,serving_size,_id');

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'User-Agent': 'SlimCircle/1.0 (weight-loss-app)',
      },
    });

    if (!response.ok) {
      console.error('Open Food Facts API error:', response.status, response.statusText);
      return [];
    }

    const data: OpenFoodFactsSearchResponse = await response.json();

    return data.products
      .map((product): FoodSearchResult | null => {
        const name = product.product_name_en || product.product_name;
        const calories = product.nutriments?.['energy-kcal_100g'] || product.nutriments?.['energy-kcal'];

        // Skip products without name or calorie data
        if (!name || (!calories && calories !== 0)) return null;

        return {
          id: `off_${product._id}`,
          name: cleanFoodName(name),
          brand: product.brands,
          caloriesPer100g: Math.round(calories),
          source: 'openfoodfacts',
          protein: product.nutriments?.proteins_100g 
            ? Math.round(product.nutriments.proteins_100g * 10) / 10 
            : undefined,
          fat: product.nutriments?.fat_100g 
            ? Math.round(product.nutriments.fat_100g * 10) / 10 
            : undefined,
          carbs: product.nutriments?.carbohydrates_100g 
            ? Math.round(product.nutriments.carbohydrates_100g * 10) / 10 
            : undefined,
          fiber: product.nutriments?.fiber_100g 
            ? Math.round(product.nutriments.fiber_100g * 10) / 10 
            : undefined,
          servingSize: product.serving_size,
        };
      })
      .filter((food): food is FoodSearchResult => food !== null);
  } catch (error) {
    console.error('Error searching Open Food Facts:', error);
    return [];
  }
}

// ============================================================================
// COMBINED SEARCH
// ============================================================================

/**
 * Search both USDA and Open Food Facts databases
 * Returns deduplicated and ranked results
 */
export async function searchFoods(
  query: string,
  apiKey: string,
  options: FoodSearchOptions = {}
): Promise<FoodSearchResult[]> {
  const {
    limit = 15,
    includeUSDA = true,
    includeOpenFoodFacts = true,
  } = options;

  if (!query || query.trim().length < 2) {
    return [];
  }

  const searchPromises: Promise<FoodSearchResult[]>[] = [];

  if (includeUSDA) {
    searchPromises.push(searchUSDA(query, apiKey, limit));
  }

  if (includeOpenFoodFacts) {
    searchPromises.push(searchOpenFoodFacts(query, limit));
  }

  const results = await Promise.all(searchPromises);
  const allResults = results.flat();

  // Deduplicate by similar names (case-insensitive)
  const seen = new Map<string, FoodSearchResult>();
  
  for (const food of allResults) {
    const key = normalizeForDedup(food.name);
    const existing = seen.get(key);
    
    // Prefer USDA results over Open Food Facts for duplicates
    if (!existing || (food.source === 'usda' && existing.source === 'openfoodfacts')) {
      seen.set(key, food);
    }
  }

  // Sort by relevance (exact matches first, then by name length)
  const queryLower = query.toLowerCase();
  const dedupedResults = Array.from(seen.values());
  
  dedupedResults.sort((a, b) => {
    const aName = a.name.toLowerCase();
    const bName = b.name.toLowerCase();
    
    // Exact match first
    const aExact = aName === queryLower ? 0 : 1;
    const bExact = bName === queryLower ? 0 : 1;
    if (aExact !== bExact) return aExact - bExact;
    
    // Starts with query
    const aStarts = aName.startsWith(queryLower) ? 0 : 1;
    const bStarts = bName.startsWith(queryLower) ? 0 : 1;
    if (aStarts !== bStarts) return aStarts - bStarts;
    
    // Shorter names are usually more generic/common
    return a.name.length - b.name.length;
  });

  return dedupedResults.slice(0, limit);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Clean up food names (remove excess whitespace, fix capitalization)
 */
function cleanFoodName(name: string): string {
  return name
    .replace(/\s+/g, ' ')
    .trim()
    // Title case if all caps
    .replace(/^[A-Z\s]+$/, (match) => 
      match.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
    );
}

/**
 * Normalize name for deduplication
 */
function normalizeForDedup(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 30); // Only compare first 30 chars
}

