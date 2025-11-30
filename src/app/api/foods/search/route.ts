import { NextRequest, NextResponse } from 'next/server';
import { searchFoods, searchUSDA, searchOpenFoodFacts, type FoodSearchResult } from '@/lib/food-search';

// Simple in-memory cache for search results
const cache = new Map<string, { data: FoodSearchResult[]; timestamp: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

/**
 * GET /api/foods/search?q=chicken&limit=15
 * Search for foods in USDA and Open Food Facts databases
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || searchParams.get('query');
    const limit = parseInt(searchParams.get('limit') || '15', 10);
    const source = searchParams.get('source'); // 'usda', 'openfoodfacts', or undefined for both

    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        { error: 'Query must be at least 2 characters' },
        { status: 400 }
      );
    }

    // Check cache
    const cacheKey = `${query.toLowerCase()}_${limit}_${source || 'all'}`;
    const cached = cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json({
        foods: cached.data,
        cached: true,
        count: cached.data.length,
      });
    }

    // Get USDA API key from environment
    const usdaApiKey = process.env.USDA_API_KEY || '';

    let results: FoodSearchResult[];

    if (source === 'usda') {
      results = await searchUSDA(query, usdaApiKey, limit);
    } else if (source === 'openfoodfacts') {
      results = await searchOpenFoodFacts(query, limit);
    } else {
      // Search both databases
      results = await searchFoods(query, usdaApiKey, {
        limit,
        includeUSDA: !!usdaApiKey,
        includeOpenFoodFacts: true,
      });
    }

    // Cache results
    cache.set(cacheKey, { data: results, timestamp: Date.now() });

    // Clean old cache entries periodically
    if (cache.size > 1000) {
      const now = Date.now();
      for (const [key, value] of cache.entries()) {
        if (now - value.timestamp > CACHE_TTL) {
          cache.delete(key);
        }
      }
    }

    return NextResponse.json({
      foods: results,
      cached: false,
      count: results.length,
      sources: {
        usda: !!usdaApiKey,
        openFoodFacts: true,
      },
    });
  } catch (error) {
    console.error('Error in food search API:', error);
    return NextResponse.json(
      { error: 'Failed to search foods' },
      { status: 500 }
    );
  }
}

