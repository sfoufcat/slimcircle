import Anthropic from '@anthropic-ai/sdk';

// Log API key status on initialization (without exposing the key)
const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  console.error('[Anthropic] WARNING: ANTHROPIC_API_KEY is not set!');
} else {
  console.log(`[Anthropic] API key loaded (${apiKey.substring(0, 10)}...)`);
}

const anthropic = new Anthropic({
  apiKey: apiKey,
});

export interface ValidationResult {
  is_valid: boolean;
  issues: string[];
  suggested_rewrite: string;
  goal_summary?: string;
}

// Keep legacy interface for backward compatibility (maps to new format)
export interface LegacyValidationResult {
  isValid: boolean;
  suggestion?: string;
  reasoning?: string;
}

export interface GoalValidationResult {
  status: 'good' | 'needs_improvement';
  feedback?: string;
  suggestedGoal?: string;
  goalSummary?: string; // 1-2 word summary like "Weight Loss", "Fitness Goal"
}

// ============================================================================
// PRE-VALIDATION PATTERNS - INSTANT REJECTION (before AI call)
// ============================================================================

// COMMITMENT: Reject patterns that are clearly NOT commitment/identity statements
const COMMITMENT_REJECT_PATTERNS: Array<{ pattern: RegExp; reason: string; suggestion: string }> = [
  // Weight/number patterns without context
  { pattern: /^\d+\s*(kg|lbs|pounds|kilos)$/i, reason: 'This is a number, not a commitment statement', suggestion: 'I am committed to a healthier lifestyle' },
  { pattern: /^lose\s+\d+/i, reason: 'This is a goal, not a commitment - describe who you want to become', suggestion: 'I am someone who prioritizes my health every day' },
  
  // Goal language (trying to, want to, going to, etc.)
  { pattern: /\b(trying|want|going|aiming|planning|hoping)\s+to\b/i, reason: 'Uses goal language ("trying to", "want to") - your commitment should be present tense "I am"', suggestion: 'I am a person who makes healthy choices' },
  
  // Specific weight targets
  { pattern: /\b(reach|hit|achieve|get\s+to)\s+\d+\s*(kg|lbs|pounds)/i, reason: 'Contains a specific weight target - this is a goal, not a commitment', suggestion: 'I am dedicated to my weight-loss journey' },
  
  // Diet/exercise specifics without identity
  { pattern: /^(eat|exercise|workout|run|gym)\s/i, reason: 'This describes an action, not who you are', suggestion: 'I am someone who values fitness and nutrition' },
];

// GOAL: Reject patterns that are too vague or malformed
const GOAL_REJECT_PATTERNS: Array<{ pattern: RegExp; reason: string; suggestion: string }> = [
  // Vague weight goals without specific amounts
  { pattern: /^(lose|drop)\s+(weight|some|a\s+lot)$/i, reason: 'Too vague - how much weight? Add a specific number', suggestion: 'Lose 10 kg' },
  { pattern: /^(get|become)\s+(thin|skinny|fit|healthy)$/i, reason: 'Too vague - what does this look like? Add a measurable target', suggestion: 'Reach 70 kg' },
  
  // Vague fitness goals
  { pattern: /^(be|become)\s+(healthier|fitter|stronger)$/i, reason: 'Too vague - how will you measure this? Add a specific outcome', suggestion: 'Lose 15 kg by July' },
  { pattern: /^(improve|get\s+better\s+at)\s+(my\s+)?(health|fitness|diet)$/i, reason: 'Too vague - improve how? Add a measurable metric', suggestion: 'Lose 8 kg bodyweight' },
  
  // Grammatically broken / incomplete
  { pattern: /^(losing|dropping|reaching)\s+\d+$/i, reason: 'Incomplete goal - losing what exactly? Add units (kg/lbs)', suggestion: 'Lose 10 kg' },
  { pattern: /^(more|better|less)$/i, reason: 'Too vague - more/better/less what? Add context and numbers', suggestion: 'Lose 5 kg this month' },
  
  // Just a number
  { pattern: /^\d+\s*(kg|lbs)?$/i, reason: 'Just a number - what does this represent? Add context', suggestion: 'Reach 75 kg target weight' },
];

// ============================================================================
// AI PROMPTS
// ============================================================================

const COMMITMENT_SYSTEM_PROMPT = `You are the Onboarding Validation Engine for SlimCircle, a weight-loss accountability app.

Your job is to evaluate and correct user-submitted commitment statements.

You must be consistent, strict, and helpful.

You ALWAYS output valid JSON only, with no extra text.

⸻

OUTPUT FORMAT

Always return ONLY this JSON:

{
  "is_valid": false,
  "issues": [],
  "suggested_rewrite": ""
}

Do NOT return explanations outside JSON.
No markdown. No paragraphs. JSON ONLY.
Do NOT include the user's original mistakes in the rewrite.
Always rewrite cleanly.

⸻

COMMITMENT VALIDATION RULES

A commitment is a short statement describing the kind of person the user commits to becoming on their weight-loss journey.

✔ A commitment IS valid if:
• It begins with "I am" or describes who they commit to being
• It describes a commitment to health/wellness, not a specific weight target
• It refers to a mindset, character, or way of being
• It does NOT contain specific numbers, weights, or timelines
• It does NOT describe a task, outcome, or weight goal
• It is written in present tense
• It is positive and self-directed

❌ A commitment is NOT valid if:
• It describes a weight goal ("I want to lose 20 kg.")
• It describes a specific action ("I will go to the gym daily.")
• It includes weights, deadlines, or specific numbers
• It's vague, random, or meaningless ("I am good")
• It is too long or contains storytelling
• It contradicts a commitment (e.g., "I am 70kg")
• It is not a commitment statement

⸻

COMMITMENT REWRITE RULES (VERY IMPORTANT)

Your rewrite MUST follow ALL these rules:

🔥 Rewrite Style
• MUST be short, punchy, max 8–10 words
• MUST be formatted like: "I am someone who [commitment]" or "I am a [type of person]"
• NO long sentences
• NO storytelling
• NO emotional descriptions
• NO filler
• DO NOT exceed 10 words
• It should feel like a crisp commitment to a way of being.

✔ Good rewrites:
• "I am someone who prioritizes my health"
• "I am committed to making healthy choices daily"
• "I am a person who shows up for myself"
• "I am dedicated to my wellness journey"

❌ Bad rewrites:
• "I am going to lose 20 kg by the summer."
• "I want to be skinny."
• "I am trying to eat less junk food."

⸻

JSON OUTPUT LOGIC

✔ is_valid: true
Only when all criteria are met.

✔ issues
List EACH problem as a short bullet phrase.
Examples:
• "Contains weight target"
• "Too vague"
• "Not a commitment statement"
• "Describes an action, not identity"

✔ suggested_rewrite
• MUST follow the rewrite rules above
• MUST be concise
• MUST NOT exceed 10 words
• MUST NOT explain anything
• MUST NOT repeat the issues

If the user's submission is already valid, still rewrite it cleaner.

⸻

✅ Example Response (Commitment)

{
  "is_valid": false,
  "issues": ["Contains weight target", "Describes goal not commitment"],
  "suggested_rewrite": "I am committed to a healthier lifestyle"
}`;

const GOAL_SYSTEM_PROMPT = `You are the Onboarding Validation Engine for SlimCircle, a weight-loss accountability app.

Your job is to evaluate and correct user-submitted weight-loss goals.

You must be consistent, strict, and helpful.

You ALWAYS output valid JSON only, with no extra text.

⸻

OUTPUT FORMAT

Always return ONLY this JSON:

{
  "is_valid": false,
  "issues": [],
  "suggested_rewrite": "",
  "goal_summary": ""
}

Fields:
- is_valid: whether the goal is specific and measurable
- issues: array of specific problems (empty if valid)
- suggested_rewrite: improved version of the goal
- goal_summary: Extract the core measurable part in 2-4 words (e.g., "Lose 10kg", "Reach 70kg", "Drop 15lbs")

Do NOT return explanations outside JSON.
No markdown. No paragraphs. JSON ONLY.
Do NOT include the user's original mistakes in the rewrite.
Always rewrite cleanly.

⸻

GOAL VALIDATION RULES (WEIGHT-LOSS SPECIFIC)

A weight-loss goal should be specific, measurable, and achievable. The deadline comes from a separate question, so do NOT penalize missing timeframes.

✔ A goal IS valid if:
• It specifies a weight target (lose X kg/lbs OR reach X kg/lbs)
• It is specific and measurable
• It describes a clear outcome
• It contains a weight number
• It is realistic (0.5-1 kg per week is healthy)
• It is six-eight words or can be rewritten as such

❌ A goal is NOT valid if:
• It is vague ("lose weight", "get fit")
• It's a commitment instead of a goal
• It's too extreme or unrealistic (lose 50kg in a month)
• It's impossible to measure
• It's too long or includes fluff
• It describes multiple goals at once
• It's a story instead of a goal

⸻

GOAL REWRITE RULES

When rewriting a goal, follow these rules:

🔥 Rewrite Style
• MUST be very concise (max 6–8 words)
• MUST focus ONLY on the weight outcome
• Remove all filler
• Keep just the core measurable part
• Should look like a bullet point, NOT a sentence.
• Use "Lose X kg" or "Reach X kg" format

✔ Good rewrites:
• "Lose 10 kg"
• "Reach 70 kg target weight"
• "Drop 15 lbs"
• "Get to 65 kg"

❌ Bad rewrites:
• "I want to lose weight and feel better about myself."
• "Become a healthier person who exercises daily."
• "Lose as much weight as possible."

⸻

JSON OUTPUT LOGIC

✔ is_valid: true
Only when all criteria are met.

✔ issues
List EACH problem as a short bullet phrase.
Examples:
• "Not measurable"
• "Too vague"
• "Missing weight target"
• "Unrealistic timeline"

✔ suggested_rewrite
• MUST follow the rewrite rules above
• MUST be concise
• MUST NOT exceed 8 words
• MUST NOT explain anything
• MUST NOT repeat the issues

If the user's submission is already valid, still rewrite it cleaner.

⸻

✅ Example Response (Goal)

{
  "is_valid": true,
  "issues": [],
  "suggested_rewrite": "Lose 10 kg",
  "goal_summary": "Lose 10kg"
}`;

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

export async function validateCommitmentStatement(
  statement: string
): Promise<LegacyValidationResult> {
  const lowerStatement = statement.toLowerCase().trim();
  
  // -------------------------------------------------------------------------
  // Normalize: prepend "I am " if not already present (UI shows "I am " as prefix)
  // -------------------------------------------------------------------------
  let normalizedStatement = statement.trim();
  if (!lowerStatement.startsWith('i am ') && !lowerStatement.startsWith("i'm ")) {
    normalizedStatement = `I am ${statement.trim()}`;
  }
  
  // -------------------------------------------------------------------------
  // STEP 1: Basic length validation
  // -------------------------------------------------------------------------
  if (statement.length < 5) {
    console.log('[Commitment Validation] REJECTED: Too short');
    return {
      isValid: false,
      reasoning: 'Too short - please describe your commitment',
      suggestion: 'I am committed to a healthier lifestyle',
    };
  }

  // -------------------------------------------------------------------------
  // STEP 2: Reject test/placeholder text
  // -------------------------------------------------------------------------
  const testPatterns = [
    /^test\s+test$/,
    /^test+$/,
    /test.*test/,
    /^asdf/,
    /^qwerty/,
    /^abc+$/,
    /^123+$/,
    /^lorem\s+ipsum/,
    /^(hello|hi)\s+(world|there)$/,
  ];
  if (testPatterns.some(pattern => pattern.test(lowerStatement))) {
    console.log('[Commitment Validation] REJECTED: Test/placeholder text');
    return {
      isValid: false,
      reasoning: 'Please enter a real commitment statement',
      suggestion: 'I am someone who prioritizes my health',
    };
  }

  // -------------------------------------------------------------------------
  // STEP 3: PRE-VALIDATION - Check against reject patterns BEFORE calling AI
  // -------------------------------------------------------------------------
  for (const { pattern, reason, suggestion } of COMMITMENT_REJECT_PATTERNS) {
    if (pattern.test(lowerStatement)) {
      console.log(`[Commitment Validation] REJECTED by pre-validation: ${reason}`);
      console.log(`[Commitment Validation] Input was: "${statement}"`);
      return {
        isValid: false,
        reasoning: reason,
        suggestion: suggestion,
      };
    }
  }

  // -------------------------------------------------------------------------
  // STEP 4: Call AI for nuanced validation
  // -------------------------------------------------------------------------
  try {
    console.log(`[Commitment Validation] Calling AI for: "${normalizedStatement}"`);
    
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: `${COMMITMENT_SYSTEM_PROMPT}

Analyze the following commitment statement and return ONLY valid JSON:

Commitment: "${normalizedStatement}"`,
        },
      ],
    });

    const content = message.content[0];
    if (content.type === 'text') {
      console.log(`[Commitment Validation] AI response: ${content.text}`);
      
      // Parse the JSON response
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result: ValidationResult = JSON.parse(jsonMatch[0]);
        console.log(`[Commitment Validation] Parsed result: is_valid=${result.is_valid}, issues=${JSON.stringify(result.issues)}`);
        
        // Map to legacy format for backward compatibility
        return {
          isValid: result.is_valid === true,
          reasoning: result.issues.length > 0 ? result.issues.join('. ') : 'Looks good!',
          suggestion: result.is_valid ? undefined : result.suggested_rewrite,
        };
      }
    }

    // -------------------------------------------------------------------------
    // FALLBACK: Parse failure = REJECT (fail-safe)
    // -------------------------------------------------------------------------
    console.error('[Commitment Validation] FAILED to parse AI response - rejecting as safety measure');
    return {
      isValid: false,
      reasoning: 'Could not validate your commitment. Please try rephrasing it.',
      suggestion: 'I am committed to my health journey',
    };
  } catch (error: any) {
    // -------------------------------------------------------------------------
    // ERROR: Reject on any error (fail-safe)
    // -------------------------------------------------------------------------
    const errorMessage = error?.message || error?.toString() || 'Unknown error';
    const errorStatus = error?.status || error?.statusCode || 'N/A';
    console.error(`[Commitment Validation] ERROR: ${errorMessage}`);
    console.error(`[Commitment Validation] Status: ${errorStatus}`);
    console.error(`[Commitment Validation] Full error:`, JSON.stringify(error, null, 2));
    
    return {
      isValid: false,
      reasoning: `Validation error: ${errorMessage.substring(0, 100)}`,
      suggestion: 'I am someone who prioritizes my health',
    };
  }
}

// Legacy function name for backward compatibility
export const validateIdentityStatement = validateCommitmentStatement;

export async function validateGoal(
  goal: string,
  targetDate: string
): Promise<GoalValidationResult> {
  const lowerGoal = goal.toLowerCase().trim();
  
  // -------------------------------------------------------------------------
  // STEP 1: Basic length validation
  // -------------------------------------------------------------------------
  if (goal.length < 3) {
    console.log('[Goal Validation] REJECTED: Too short');
    return {
      status: 'needs_improvement',
      feedback: 'Too short - please describe your weight-loss goal',
      suggestedGoal: 'Lose 10 kg',
    };
  }

  // -------------------------------------------------------------------------
  // STEP 2: Reject test/placeholder text
  // -------------------------------------------------------------------------
  const testPatterns = [
    /^test+\s*test+/,
    /^asdf/,
    /^qwerty/,
    /^abc+$/,
    /^123+$/,
  ];
  if (testPatterns.some(pattern => pattern.test(lowerGoal))) {
    console.log('[Goal Validation] REJECTED: Test/placeholder text');
    return {
      status: 'needs_improvement',
      feedback: 'Please enter a real weight-loss goal',
      suggestedGoal: 'Lose 15 kg',
    };
  }

  // -------------------------------------------------------------------------
  // STEP 3: PRE-VALIDATION - Check against reject patterns BEFORE calling AI
  // -------------------------------------------------------------------------
  for (const { pattern, reason, suggestion } of GOAL_REJECT_PATTERNS) {
    if (pattern.test(lowerGoal)) {
      console.log(`[Goal Validation] REJECTED by pre-validation: ${reason}`);
      console.log(`[Goal Validation] Input was: "${goal}"`);
      return {
        status: 'needs_improvement',
        feedback: reason,
        suggestedGoal: suggestion,
      };
    }
  }

  // -------------------------------------------------------------------------
  // STEP 4: Call AI for nuanced validation
  // -------------------------------------------------------------------------
  try {
    console.log(`[Goal Validation] Calling AI for: "${goal}" (target: ${targetDate})`);
    
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: `${GOAL_SYSTEM_PROMPT}

Analyze the following weight-loss goal and return ONLY valid JSON:

Goal: "${goal}"
Target Date: ${targetDate}`,
        },
      ],
    });

    const content = message.content[0];
    if (content.type === 'text') {
      console.log(`[Goal Validation] AI response: ${content.text}`);
      
      // Parse the JSON response
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result: ValidationResult = JSON.parse(jsonMatch[0]);
        console.log(`[Goal Validation] Parsed result: is_valid=${result.is_valid}, issues=${JSON.stringify(result.issues)}, summary=${result.goal_summary}`);
        
        // Map to legacy format for backward compatibility
        return {
          status: result.is_valid ? 'good' : 'needs_improvement',
          feedback: result.issues.length > 0 ? result.issues.join('. ') : 'Your goal looks good!',
          suggestedGoal: result.is_valid ? undefined : result.suggested_rewrite,
          goalSummary: result.goal_summary,
        };
      }
    }

    // -------------------------------------------------------------------------
    // FALLBACK: Parse failure = REJECT (fail-safe)
    // -------------------------------------------------------------------------
    console.error('[Goal Validation] FAILED to parse AI response - rejecting as safety measure');
    return {
      status: 'needs_improvement',
      feedback: 'Could not validate your goal. Please try rephrasing it.',
      suggestedGoal: 'Lose 10 kg',
    };
  } catch (error: any) {
    // -------------------------------------------------------------------------
    // ERROR: Reject on any error (fail-safe)
    // -------------------------------------------------------------------------
    const errorMessage = error?.message || error?.toString() || 'Unknown error';
    const errorStatus = error?.status || error?.statusCode || 'N/A';
    console.error(`[Goal Validation] ERROR: ${errorMessage}`);
    console.error(`[Goal Validation] Status: ${errorStatus}`);
    console.error(`[Goal Validation] Full error:`, JSON.stringify(error, null, 2));
    
    return {
      status: 'needs_improvement',
      feedback: `Validation error: ${errorMessage.substring(0, 100)}`,
      suggestedGoal: 'Lose 10 kg',
    };
  }
}

// ============================================================================
// TRANSFORMATION TEXT GENERATION
// ============================================================================

export interface TransformationTextInput {
  currentSituation?: string;
  peerAccountability?: string;
  goal?: string;
  commitment?: string;
}

export interface TransformationTextResult {
  text: string;
  error?: string;
}

const TRANSFORMATION_PROMPT = `You are a motivational copywriter for SlimCircle, a weight-loss accountability app.

Your job is to write ONE SHORT, punchy sentence that explains why THIS journey will work for them.

You MUST:
- Address their specific accountability situation in the sentence
- Be confident and inspiring, not generic
- Use "you" language (second person)
- Keep it to EXACTLY 1 sentence
- Be concise (max 15-20 words)
- Focus on weight-loss and health transformation

You MUST NOT:
- Be generic or vague
- Use clichés like "unlock your potential" or "transform your life"
- Mention the app or product
- Write more than 1 sentence
- Use bullet points or lists

Return ONLY the single sentence. No quotes, no explanation, just the text.`;

export async function generateTransformationText(
  input: TransformationTextInput
): Promise<TransformationTextResult> {
  try {
    const { currentSituation, peerAccountability, goal, commitment } = input;
    
    // Format peer accountability for the prompt
    const peerAccountabilityMap: Record<string, string> = {
      'alone': 'doing this alone without peer accountability',
      'no_daily_system': 'having communities but no daily accountability system',
      'inconsistent': 'inconsistent accountability',
      'strong_accountability': 'strong peer accountability',
    };
    
    const formattedAccountability = peerAccountabilityMap[peerAccountability || ''] || 'limited accountability';
    
    // Format current situation
    const situationMap: Record<string, string> = {
      'just_starting': 'just getting started on their weight-loss journey',
      'tried_before': 'tried before but struggled to maintain',
      'maintaining': 'maintaining but wanting to push further',
      'struggling': 'currently struggling with their weight',
      'fresh_start': 'ready for a fresh start',
    };
    const formattedSituation = situationMap[currentSituation || ''] || currentSituation || 'their current stage';
    
    console.log(`[Transformation Text] Generating for: situation=${formattedSituation}, accountability=${formattedAccountability}, goal=${goal}`);
    
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
      messages: [
        {
          role: 'user',
          content: `${TRANSFORMATION_PROMPT}

User context:
- Current situation: ${formattedSituation}
- Current accountability situation: ${formattedAccountability}
- Weight-loss goal: ${goal || 'reach their target weight'}
- Commitment: ${commitment || 'committed to a healthier lifestyle'}

Write the motivational sentence:`,
        },
      ],
    });

    const content = message.content[0];
    if (content.type === 'text') {
      const text = content.text.trim();
      console.log(`[Transformation Text] Generated: ${text}`);
      return { text };
    }

    return { 
      text: 'With the right support and accountability, you\'ll finally reach your weight-loss goals.',
      error: 'Failed to parse AI response'
    };
  } catch (error: any) {
    const errorMessage = error?.message || 'Unknown error';
    console.error(`[Transformation Text] ERROR: ${errorMessage}`);
    
    // Return a decent fallback
    return { 
      text: 'With the right support and accountability, you\'ll finally reach your weight-loss goals.',
      error: errorMessage
    };
  }
}

// ============================================================================
// GOAL SUMMARY GENERATION (1-2 word summary for chart labels)
// ============================================================================

export interface GoalSummaryResult {
  summary: string;
  error?: string;
}

const GOAL_SUMMARY_PROMPT = `Generate a 1-2 word summary/category for the following weight-loss goal.

Rules:
- MUST be 1-2 words maximum
- Should capture the essence of the goal
- Use title case (e.g., "Lose 10kg", "Target 70kg")
- Be specific and descriptive
- NO articles (a, an, the)
- NO verbs in present tense (use nouns or noun phrases)

Examples:
- "Lose 20kg by summer" → "Lose 20kg"
- "Get down to 70kg" → "Target 70kg"  
- "Drop 15 pounds" → "Drop 15lbs"
- "Reach my goal weight of 65kg" → "Reach 65kg"
- "Lose belly fat and get to 80kg" → "Target 80kg"

Return ONLY the 1-2 word summary. No quotes, no explanation, just the summary.`;

export async function generateGoalSummary(goal: string): Promise<GoalSummaryResult> {
  if (!goal || goal.trim().length < 3) {
    return { summary: 'Weight Goal' };
  }

  try {
    console.log(`[Goal Summary] Generating for: "${goal}"`);
    
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 50,
      messages: [
        {
          role: 'user',
          content: `${GOAL_SUMMARY_PROMPT}

Goal: "${goal}"

Summary:`,
        },
      ],
    });

    const content = message.content[0];
    if (content.type === 'text') {
      // Clean up the response - remove quotes, trim, limit to 2 words
      let summary = content.text.trim().replace(/["']/g, '');
      
      // Ensure it's max 2 words
      const words = summary.split(/\s+/);
      if (words.length > 2) {
        summary = words.slice(0, 2).join(' ');
      }
      
      console.log(`[Goal Summary] Generated: ${summary}`);
      return { summary };
    }

    return { summary: 'Weight Goal', error: 'Failed to parse AI response' };
  } catch (error: any) {
    const errorMessage = error?.message || 'Unknown error';
    console.error(`[Goal Summary] ERROR: ${errorMessage}`);
    return { summary: 'Weight Goal', error: errorMessage };
  }
}

// ============================================================================
// ACCOUNTABILITY SUMMARY GENERATION (1-2 word summary for chart labels)
// ============================================================================

export interface AccountabilitySummaryResult {
  summary: string;
  error?: string;
}

// Map of accountability answer values to their full question text
const ACCOUNTABILITY_ANSWER_TEXT: Record<string, string> = {
  'alone': "No, I'm doing this alone",
  'no_daily_system': "I have communities but no daily accountability system",
  'inconsistent': "I have some accountability, but it's not consistent",
  'strong_accountability': "Yes, I have strong peer accountability",
};

const ACCOUNTABILITY_SUMMARY_PROMPT = `Generate a 1-2 word summary describing someone's current accountability/support situation for their weight-loss journey.

The user was asked: "Do you have people who check in on your progress every day?"

Rules:
- MUST be 1-2 words maximum
- Should describe their CURRENT state (what they have now)
- Use title case (e.g., "Solo Journey", "No Support")
- Be specific and descriptive
- NO articles (a, an, the)
- NO verbs - use nouns or noun phrases ONLY
- Should feel like a status label

Examples of good summaries:
- For someone doing it alone → "Solo Journey" or "No Support"
- For someone with communities but no daily system → "Loose Network" or "No System"
- For someone with inconsistent accountability → "Spotty Support" or "Some Support"
- For someone with strong accountability → "Strong Network" or "Good Support"

Return ONLY the 1-2 word summary. No quotes, no explanation, just the summary.`;

export async function generateAccountabilitySummary(
  peerAccountability: string
): Promise<AccountabilitySummaryResult> {
  // Get the full answer text
  const answerText = ACCOUNTABILITY_ANSWER_TEXT[peerAccountability];
  
  if (!answerText) {
    return { summary: 'Starting Point' };
  }

  try {
    console.log(`[Accountability Summary] Generating for: "${peerAccountability}" = "${answerText}"`);
    
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 50,
      messages: [
        {
          role: 'user',
          content: `${ACCOUNTABILITY_SUMMARY_PROMPT}

Their answer: "${answerText}"

Summary:`,
        },
      ],
    });

    const content = message.content[0];
    if (content.type === 'text') {
      // Clean up the response - remove quotes, trim, limit to 2 words
      let summary = content.text.trim().replace(/["']/g, '');
      
      // Ensure it's max 2 words
      const words = summary.split(/\s+/);
      if (words.length > 2) {
        summary = words.slice(0, 2).join(' ');
      }
      
      console.log(`[Accountability Summary] Generated: ${summary}`);
      return { summary };
    }

    return { summary: 'Starting Point', error: 'Failed to parse AI response' };
  } catch (error: any) {
    const errorMessage = error?.message || 'Unknown error';
    console.error(`[Accountability Summary] ERROR: ${errorMessage}`);
    return { summary: 'Starting Point', error: errorMessage };
  }
}
