import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

// Static mapping for growth stage labels
const GROWTH_STAGE_LABELS: Record<string, string> = {
  'just_starting': 'Just Starting',
  'building_momentum': 'Building Momentum',
  'growing_steadily': 'Growing Steadily',
  'leveling_up': 'Leveling Up',
  'reinventing': 'Reinventing',
};

export async function POST(req: Request) {
  // Default values - guaranteed to return something
  let goalSummary = 'Your Goal';
  let stageSummary = 'Starting Point';

  try {
    const body = await req.json();
    const { goal, businessStage } = body;

    // Static growth stage mapping (instant)
    if (businessStage && GROWTH_STAGE_LABELS[businessStage]) {
      stageSummary = GROWTH_STAGE_LABELS[businessStage];
    }

    // AI-generated goal summary
    if (goal && process.env.ANTHROPIC_API_KEY) {
      try {
        const anthropic = new Anthropic({
          apiKey: process.env.ANTHROPIC_API_KEY,
        });

        const message = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 50,
          messages: [{
            role: 'user',
            content: `Generate a 1-2 word summary for this goal. Return ONLY the summary, no quotes or explanation.

Examples:
- "Lose 20kg" → "Weight Loss"
- "Reach $50k MRR" → "Revenue Growth"
- "Launch my app" → "App Launch"

Goal: "${goal}"
Summary:`,
          }],
        });

        const content = message.content[0];
        if (content.type === 'text') {
          let summary = content.text.trim().replace(/["']/g, '');
          const words = summary.split(/\s+/);
          if (words.length > 2) summary = words.slice(0, 2).join(' ');
          if (summary) goalSummary = summary;
        }
      } catch (aiError) {
        console.error('[Goal Summary AI Error]', aiError);
        // Keep default goalSummary
      }
    }
  } catch (parseError) {
    console.error('[Summary API Parse Error]', parseError);
  }

  // Always return something
  return NextResponse.json({ goalSummary, stageSummary });
}
