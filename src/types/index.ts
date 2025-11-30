// Clerk User Types
export interface ClerkUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  imageUrl: string;
  createdAt: string;
  updatedAt: string;
  publicMetadata?: {
    role?: UserRole;
  };
}

// User Role Types
export type UserRole = 'user' | 'editor' | 'coach' | 'admin' | 'super_admin';

// User Tier Types (for subscription/access level - does NOT include coaching)
// Coaching is a separate product, not a membership tier
export type UserTier = 'free' | 'standard' | 'premium';

// Coaching Status Types (separate from membership tier)
export type CoachingStatus = 'none' | 'active' | 'canceled' | 'past_due';
export type CoachingPlan = 'monthly' | 'quarterly' | null;

// Onboarding Status Types
export type OnboardingStatus = 
  | 'welcome' 
  | 'physical_profile'  // Age, sex, height, weight
  | 'activity_level'    // Activity level selection
  | 'current_situation'
  | 'obstacles'
  | 'goal_setting'
  | 'goal_impact'
  | 'support_needs'
  | 'create_profile_intro' 
  | 'edit_profile' 
  | 'commitment' 
  | 'weight_goal' 
  | 'transformation'
  | 'plan'
  | 'completed';

// Onboarding Quiz Types
export type CurrentSituation = 'just_starting' | 'tried_before' | 'maintaining' | 'struggling' | 'fresh_start';
export type GoalImpactLevel = 'transformational' | 'a_lot' | 'somewhat' | 'a_little';

// Legacy types for backward compatibility with existing onboarding pages
export type BusinessStage = 'just_starting' | 'building_momentum' | 'growing_steadily' | 'leveling_up' | 'reinventing';
export type WorkdayStyle = 'chaotic' | 'busy' | 'productive' | 'disciplined';

export type PeerAccountability = 
  | 'alone'
  | 'no_daily_system'
  | 'inconsistent'
  | 'strong_accountability';

export type OnboardingSupportNeed = 
  | 'daily_checkins'
  | 'accountability'
  | 'clear_system'
  | 'expert_guidance'
  | 'inspiration';

// Onboarding Quiz Data
export interface OnboardingQuizData {
  currentSituation?: CurrentSituation;
  peerAccountability?: PeerAccountability;
  obstacles?: string[];
  goalImpact?: GoalImpactLevel;
  supportNeeds?: OnboardingSupportNeed[];
}

// Billing Types
export type BillingPlan = 'standard' | 'premium' | null;
export type BillingStatus = 'active' | 'past_due' | 'canceled' | 'trialing' | null;

export interface BillingInfo {
  plan: BillingPlan;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  status: BillingStatus;
  currentPeriodEnd?: string; // ISO date when current billing period ends
  cancelAtPeriodEnd?: boolean; // True if subscription will cancel at period end
}

// Coaching subscription info (separate from main membership billing)
export interface CoachingInfo {
  status: CoachingStatus;
  plan: CoachingPlan;
  stripeSubscriptionId?: string;
  startedAt?: string; // ISO date when coaching started
  endsAt?: string; // ISO date when coaching access ends (for canceled)
  coachPreference?: string; // Selected coach preference during intake
}

// ============================================================================
// WEIGHT LOSS PROFILE & GOAL TYPES
// ============================================================================

export type WeightUnit = 'kg' | 'lbs';
export type Sex = 'male' | 'female';
export type BodyType = 'slim' | 'average' | 'overweight' | 'obese';
export type ActivityLevel = 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extra_active';

// User's physical profile for calorie calculations
export interface WeightLossProfile {
  age?: number; // User's age in years
  sex?: Sex; // For BMR calculations
  heightCm?: number; // Height in centimeters
  weightKg?: number; // Current weight in kilograms (canonical)
  bodyType?: BodyType; // Optional body type classification
  activityLevel?: ActivityLevel; // For TDEE calculations
  // Calculated values (stored for quick access)
  bmi?: number; // Body Mass Index
  bmr?: number; // Basal Metabolic Rate
  tdee?: number; // Total Daily Energy Expenditure
  dailyCalorieTarget?: number; // Target calories per day
  targetDailyDeficit?: number; // Calorie deficit needed per day
}

export interface WeightLossGoal {
  id?: string;
  userId?: string;
  title?: string; // User-entered goal description, e.g., "Lose 10 kg"
  startWeight?: number; // Starting weight when goal was set
  currentWeight?: number; // Most recent weight entry
  targetWeight?: number; // Goal weight
  unit?: WeightUnit; // kg or lbs
  startDate?: string; // ISO date when goal was set
  targetDate?: string; // ISO date for achieving goal
  weeklyTargetLoss?: number; // Optional: target kg/lbs to lose per week
  isActive?: boolean;
  status?: 'active' | 'completed' | 'archived' | 'paused'; // Goal status
  progress?: number; // 0-100 percentage towards goal
  createdAt?: string;
  updatedAt?: string;
  completedAt?: string; // Set when goal is achieved
  archivedAt?: string; // Set when goal is archived
}

// ============================================================================
// DAILY INTAKE & ACTIVITY TYPES
// ============================================================================

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type ActivityType = 
  | 'walking' 
  | 'running' 
  | 'cycling' 
  | 'swimming' 
  | 'strength_training' 
  | 'pilates' 
  | 'yoga' 
  | 'hiit' 
  | 'dancing'
  | 'hiking'
  | 'sports'
  | 'other';

// Ingredient in a meal
export interface MealIngredient {
  id: string;
  name: string;
  grams: number; // Amount in grams
  caloriesPer100g: number; // Calorie density
  calories: number; // Computed: (grams / 100) * caloriesPer100g
}

// Saved meal template for quick re-use
export interface SavedMeal {
  id: string;
  userId: string;
  name: string; // e.g., "My usual breakfast"
  ingredients: MealIngredient[];
  totalCalories: number;
  createdAt: string;
  updatedAt: string;
}

// Daily intake entry (a meal logged for the day)
export interface DailyIntakeEntry {
  id: string;
  userId: string;
  groupId?: string; // For circle visibility
  date: string; // YYYY-MM-DD
  mealName: string; // e.g., "Breakfast", "Lunch", custom name
  mealType?: MealType;
  ingredients: MealIngredient[];
  totalCalories: number;
  isPrivate: boolean;
  createdAt: string;
  updatedAt: string;
}

// Daily activity entry (exercise logged for the day)
export interface DailyActivityEntry {
  id: string;
  userId: string;
  groupId?: string; // For circle visibility
  date: string; // YYYY-MM-DD
  activityType: ActivityType;
  activityName: string; // Display name, e.g., "Running", "Morning Walk"
  durationMinutes: number;
  caloriesBurned: number; // Computed from calculator
  isPrivate: boolean;
  createdAt: string;
  updatedAt: string;
}

// Daily calorie summary
export interface DailyCalorieSummary {
  date: string;
  targetCalories: number;
  consumedCalories: number; // Sum of intake entries
  burnedCalories: number; // Sum of activity entries
  netCalories: number; // consumed - burned
  deficitVsTarget: number; // targetCalories - netCalories
}

// ============================================================================
// DAILY HEALTH LOG TYPES
// ============================================================================

export interface MealEntry {
  id: string;
  time?: string; // Optional time HH:MM
  description: string; // What they ate
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
}

export interface WorkoutEntry {
  completed: boolean;
  type?: string; // e.g., "Running", "Gym", "Yoga"
  duration?: number; // minutes
  description?: string; // Optional details
}

export interface DailyHealthLog {
  id: string;
  date: string; // YYYY-MM-DD
  userId: string;
  groupId?: string; // Optional group/circle ID for visibility
  
  // Meals
  meals: MealEntry[];
  
  // Workout
  workout: WorkoutEntry;
  
  // Weight (optional daily weigh-in)
  weight?: number;
  weightUnit?: WeightUnit;
  
  // Overall day rating
  dayRating?: 'great' | 'good' | 'okay' | 'tough';
  
  // Notes
  notes?: string;
  
  // Visibility
  isPrivate: boolean;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// USER TYPES
// ============================================================================

// Firebase User Types
export interface FirebaseUser extends ClerkUser {
  // Add any additional fields specific to your Firebase users
  bio?: string;
  preferences?: UserPreferences;
  commitment?: string; // Health commitment statement
  commitmentSetAt?: string;
  commitmentHistory?: CommitmentHistoryEntry[];
  
  // Weight Loss Profile (physical stats for calorie calculations)
  weightLossProfile?: WeightLossProfile;
  
  // Weight Loss Goal fields
  weightGoal?: WeightLossGoal;
  currentWeight?: number;
  targetWeight?: number;
  weightUnit?: WeightUnit;
  goalSetAt?: string;
  goalProgress?: number; // Progress percentage (0-100)
  goalHistory?: GoalHistoryEntry[];
  
  // NOTE: role is NOW stored in Clerk publicMetadata, not Firebase
  // Access via: user.publicMetadata?.role
  circleId?: string | null; // Accountability circle membership (renamed from squadId)
  tier?: UserTier; // User subscription tier (defaults to 'standard')
  
  // Referral tracking (set when user joins via invite link)
  invitedBy?: string; // User ID of who invited them
  inviteCode?: string; // The invite code they used
  invitedAt?: string; // ISO timestamp when they joined via invite
  
  // Onboarding
  onboardingStatus?: OnboardingStatus; // Track onboarding progress
  hasCompletedOnboarding?: boolean; // Quick check for completed onboarding
  onboarding?: OnboardingQuizData; // Quiz answers from onboarding flow
  
  // Billing
  billing?: BillingInfo; // Stripe billing information
  
  // Coaching (separate from membership billing)
  coaching?: CoachingInfo; // Coaching subscription info
  coachId?: string | null; // Assigned coach's user ID
  
  // Email tracking for onboarding flows
  quizStarted?: boolean; // True when user starts the quiz
  quizStartedAt?: string; // ISO timestamp when quiz was started
  convertedToMember?: boolean; // True when user successfully pays
  abandonedEmailSent?: boolean; // True when abandoned cart email was sent
  welcomeEmailSent?: boolean; // True when welcome email was sent
  
  // Profile fields
  name?: string; // Display name (can differ from firstName + lastName)
  avatarUrl?: string; // Profile picture URL (overrides Clerk imageUrl if set)
  location?: string; // e.g., "Berlin, DE"
  profession?: string; // Job title/profession
  company?: string; // Company/organization name
  identity?: string; // User's self-identity statement (e.g., "I am a healthy, disciplined person")
  interests?: string; // Comma-separated or free text (fitness interests)
  instagramHandle?: string;
  linkedinHandle?: string;
  twitterHandle?: string; // X/Twitter
  websiteUrl?: string;
  phoneNumber?: string;
  
  // Weekly Reflection fields
  publicFocus?: string; // Public focus for next week (from weekly reflection)
  publicFocusUpdatedAt?: string; // When publicFocus was last updated
  goalCompleted?: boolean; // Whether the goal has been completed
  goalCompletedAt?: string; // When the goal was completed
  
  // Notification preferences
  notificationPreferences?: NotificationPreferences;
  emailPreferences?: EmailPreferences; // User's email notification preferences
  timezone?: string; // IANA timezone e.g. "Europe/Amsterdam" for notification scheduling
}

export interface CommitmentHistoryEntry {
  statement: string;
  setAt: string;
}

export interface GoalHistoryEntry {
  goal: string;
  targetDate: string;
  targetWeight?: number;
  startWeight?: number;
  setAt: string;
  progress: number; // Final progress when archived/completed
  completedAt: string | null; // Set when goal was completed (100%)
  archivedAt: string | null; // Set when goal was archived (not completed)
}

// Habit Types
export type FrequencyType = 
  | 'daily'
  | 'weekly_specific_days'
  | 'weekly_number'
  | 'monthly_specific_days'
  | 'monthly_number';

export interface HabitReminder {
  time: string; // HH:MM format
}

export interface HabitProgress {
  currentCount: number;
  lastCompletedDate: string | null;
  completionDates: string[]; // ISO dates of all completions
  skipDates?: string[]; // ISO dates of all skips
}

export type HabitStatus = 'active' | 'completed' | 'archived';

export interface Habit {
  id: string;
  userId: string;
  text: string;
  linkedRoutine?: string;
  frequencyType: FrequencyType;
  frequencyValue: number[] | number; // array for specific days, number for count
  reminder: HabitReminder | null;
  targetRepetitions?: number | null; // null means "No limit"
  progress: HabitProgress;
  archived: boolean; // Legacy field, keep for backward compatibility
  status?: HabitStatus; // New field: 'active', 'completed', or 'archived'
  createdAt: string;
  updatedAt: string;
}

export type HabitFormData = {
  text: string;
  linkedRoutine: string;
  frequencyType: FrequencyType;
  frequencyValue: number[] | number;
  reminder: HabitReminder | null;
  targetRepetitions: number | null;
}

export type CreateHabitRequest = HabitFormData

export interface UserPreferences {
  theme?: 'light' | 'dark';
  notifications?: boolean;
  emailUpdates?: boolean;
  weightUnit?: WeightUnit;
}

// Stream Chat Types
export interface StreamUser {
  id: string;
  name: string;
  image?: string;
}

export interface StreamTokenResponse {
  token: string;
  userId: string;
}

// API Response Types
export interface ApiError {
  error: string;
  message?: string;
}

export interface ApiSuccess<T = unknown> {
  success: true;
  data: T;
}

export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError;

// Commitment Validation Types (renamed from Identity)
export interface ValidationResult {
  isValid: boolean;
  reasoning?: string;
  suggestion?: string;
}

export interface CommitmentSaveResponse {
  success: boolean;
  commitment: string;
  setAt: string;
}

// Goal Validation Types
export interface GoalValidationResult {
  status: 'good' | 'needs_improvement';
  feedback?: string;
  suggestedGoal?: string;
  goalSummary?: string; // 1-2 word summary like "Weight Loss", "Fitness Goal"
}

export interface GoalSaveResponse {
  success: boolean;
  goal: string;
  targetDate: string;
  targetWeight?: number;
  setAt: string;
}

// Daily Intake API Types
export interface CreateIntakeRequest {
  date: string; // YYYY-MM-DD
  mealName: string;
  mealType?: MealType;
  ingredients: Omit<MealIngredient, 'id' | 'calories'>[];
  isPrivate?: boolean;
  savedMealId?: string; // If using a saved meal template
}

export interface UpdateIntakeRequest {
  mealName?: string;
  mealType?: MealType;
  ingredients?: Omit<MealIngredient, 'id' | 'calories'>[];
  isPrivate?: boolean;
}

// Daily Activity API Types
export interface CreateActivityRequest {
  date: string; // YYYY-MM-DD
  activityType: ActivityType;
  activityName?: string; // Optional custom name
  durationMinutes: number;
  isPrivate?: boolean;
}

export interface UpdateActivityRequest {
  activityType?: ActivityType;
  activityName?: string;
  durationMinutes?: number;
  isPrivate?: boolean;
}

// Saved Meal API Types
export interface CreateSavedMealRequest {
  name: string;
  ingredients: Omit<MealIngredient, 'id' | 'calories'>[];
}

// Weight Loss Profile API Types
export interface UpdateWeightLossProfileRequest {
  age?: number;
  sex?: Sex;
  heightCm?: number;
  weightKg?: number;
  bodyType?: BodyType;
  activityLevel?: ActivityLevel;
}

// Task Types (repurposed for health actions/logs)
export type TaskStatus = 'pending' | 'completed';
export type TaskListType = 'focus' | 'backlog';

export interface Task {
  id: string;
  userId: string;
  title: string;
  status: TaskStatus;
  listType: TaskListType;
  order: number;
  date: string; // ISO date (YYYY-MM-DD)
  isPrivate: boolean;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface TaskFormData {
  title: string;
  isPrivate: boolean;
  listType?: TaskListType;
}

export interface CreateTaskRequest extends TaskFormData {
  date: string;
}

export interface UpdateTaskRequest {
  title?: string;
  status?: TaskStatus;
  listType?: TaskListType;
  order?: number;
  isPrivate?: boolean;
}

// Circle Types (renamed from Squad)
export type CircleRoleInCircle = 'member' | 'coach';
export type MoodState = 'energized' | 'confident' | 'neutral' | 'uncertain' | 'stuck';
export type CircleVisibility = 'public' | 'private';

export interface Circle {
  id: string;
  name: string;
  avatarUrl: string;
  description?: string; // Optional circle description
  visibility?: CircleVisibility; // "public" or "private" - defaults to "public" if not set
  timezone?: string; // IANA timezone e.g. "Europe/Amsterdam" - defaults to "UTC"
  memberIds?: string[]; // Array of member user IDs (excludes coach)
  inviteCode?: string; // e.g. "SC-XY29Q8" - required for private circles
  isPremium: boolean;
  coachId: string | null; // Required if premium
  createdAt: string;
  updatedAt: string;
  streak?: number | null; // Circle streak (consecutive days with >=50% members fully aligned)
  avgAlignment?: number | null; // Average alignment score of members today
  chatChannelId?: string | null; // Stream Chat channel ID for circle group chat
  // Cached stats for performance - with 5-minute TTL + invalidation on alignment change
  cachedAvgAlignment?: number;
  cachedAlignmentChange?: number;
  cachedMemberAlignments?: Record<string, { alignmentScore: number; currentStreak: number }>;
  cachedAt?: string; // Date string (YYYY-MM-DD) when cache was last updated
  cachedAtTimestamp?: string; // ISO timestamp for TTL checking (5-minute freshness)
  // Premium circle call fields
  nextCallDateTime?: string | null; // ISO 8601 timestamp (stored in UTC)
  nextCallTimezone?: string | null; // IANA timezone e.g. "America/New_York"
  nextCallLocation?: string | null; // e.g. "Circle chat", "Zoom", a URL
  nextCallTitle?: string | null; // Optional custom title, defaults to "Circle coaching call"
}

// Legacy Squad type alias for backward compatibility
export type Squad = Circle;
export type SquadRoleInSquad = CircleRoleInCircle;
export type SquadVisibility = CircleVisibility;

export interface CircleMember {
  id: string;
  circleId: string;
  userId: string;
  roleInCircle: CircleRoleInCircle;
  // User details (denormalized for display)
  firstName: string;
  lastName: string;
  imageUrl: string;
  alignmentScore?: number | null;
  streak?: number | null;
  moodState?: MoodState | null;
  createdAt: string;
  updatedAt: string;
}

// Legacy SquadMember type alias
export type SquadMember = CircleMember;

export interface ContributionDay {
  date: string; // ISO date YYYY-MM-DD
  completionRate: number; // 0-100 percentage of circle members who logged their day
}

export interface CircleStats {
  avgAlignment: number; // 0-100
  alignmentChange: number; // e.g., +2.3 or -1.5
  topPercentile: number; // e.g., 1 for "top 1%"
  contributionHistory: ContributionDay[]; // Last 30-60 days
}

// Legacy SquadStats alias
export type SquadStats = CircleStats;

// Morning Check-In Types
export type EmotionalState = 
  | 'low_stuck' 
  | 'uneasy' 
  | 'uncertain' 
  | 'neutral' 
  | 'steady' 
  | 'confident' 
  | 'energized';

export interface MorningCheckIn {
  id: string;
  date: string; // YYYY-MM-DD
  userId: string;
  emotionalState: EmotionalState;
  userThought?: string; // What user typed/spoke in reframe step
  aiReframe?: string; // AI's reframed thought
  manifestCommitmentCompleted: boolean; // Renamed from manifestIdentityCompleted
  manifestGoalCompleted: boolean;
  tasksPlanned: boolean;
  completedAt?: string; // ISO timestamp when flow was completed
  createdAt: string;
  updatedAt: string;
}

export interface CheckInProgress {
  currentStep: CheckInStep;
  emotionalState?: EmotionalState;
  userThought?: string;
  aiReframe?: string;
  breathingCompleted?: boolean;
  manifestCommitmentCompleted?: boolean;
  manifestGoalCompleted?: boolean;
}

export type CheckInStep = 
  | 'start'
  | 'accept'
  | 'breath'
  | 'reframe'
  | 'neutralize'
  | 'manifest-commitment'
  | 'manifest-goal'
  | 'plan-day'
  | 'completed';

// Reflection Types
export type ReflectionType = 'daily' | 'weekly';

// Combined emotional state type for reflections (supports both morning and evening)
export type ReflectionEmotionalState = EmotionalState | EveningEmotionalState;

export interface DailyReflection {
  id: string;
  userId: string;
  goalId: string;
  type: 'daily';
  date: string; // ISO date YYYY-MM-DD
  emotionalState: ReflectionEmotionalState;
  tasksCompleted: number;
  tasksTotal: number;
  note: string;
  createdAt: string;
  updatedAt: string;
}

export interface WeeklyReflection {
  id: string;
  userId: string;
  goalId: string;
  type: 'weekly';
  date: string; // ISO date YYYY-MM-DD (start of week)
  weekEndDate: string; // ISO date YYYY-MM-DD (end of week)
  progressChange: number; // e.g., +12 or -5
  onTrackStatus: 'on_track' | 'not_sure' | 'off_track';
  whatWentWell: string;
  biggestObstacles: string;
  nextWeekPlan: string;
  publicFocus?: string; // Public focus for next week
  createdAt: string;
  updatedAt: string;
}

// Weekly Reflection Check-in Types (for the flow)
export type OnTrackStatus = 'on_track' | 'not_sure' | 'off_track';

export interface WeeklyReflectionCheckIn {
  id: string;
  date: string; // YYYY-MM-DD (week identifier)
  userId: string;
  onTrackStatus: OnTrackStatus;
  progress: number; // 0-100 progress percentage
  previousProgress: number; // Previous progress for calculating change
  whatWentWell?: string;
  biggestObstacles?: string;
  nextWeekPlan?: string;
  publicFocus?: string; // Public focus shared on profile
  goalCompleted?: boolean; // True if progress = 100
  completedAt?: string; // ISO timestamp when flow was completed
  createdAt: string;
  updatedAt: string;
}

export type Reflection = DailyReflection | WeeklyReflection;

// Goal with progress (extended from user data)
export interface Goal {
  id: string;
  userId: string;
  title: string;
  targetDate: string;
  targetWeight?: number;
  startWeight?: number;
  currentWeight?: number;
  progress: number; // 0-100
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

// Evening Check-In Types
export type EveningEmotionalState = 
  | 'tough_day' 
  | 'mixed' 
  | 'steady' 
  | 'good_day' 
  | 'great_day';

export interface EveningCheckIn {
  id: string;
  date: string; // YYYY-MM-DD
  userId: string;
  emotionalState: EveningEmotionalState;
  reflectionText?: string; // Optional reflection note
  tasksCompleted: number;
  tasksTotal: number;
  completedAt?: string; // ISO timestamp when flow was completed
  createdAt: string;
  updatedAt: string;
}

// Daily Alignment & Streak Types
export interface UserAlignment {
  id: string; // Format: `${userId}_${YYYY-MM-DD}`
  userId: string;
  date: string; // "YYYY-MM-DD" — normalized date
  didMorningCheckin: boolean;
  didLogMeals: boolean; // Renamed from didSetTasks
  didLogWorkout: boolean; // New field
  didInteractWithCircle: boolean; // Renamed from didInteractWithSquad
  hasActiveGoal: boolean;
  alignmentScore: number; // 0, 25, 50, 75, 100
  fullyAligned: boolean; // alignmentScore === 100
  streakOnThisDay: number; // integer >= 0, streak snapshot for that day
  createdAt: string;
  updatedAt: string;
}

export interface UserAlignmentSummary {
  userId: string;
  currentStreak: number; // consecutive days with fullyAligned true
  lastAlignedDate?: string; // last date with fullyAligned true (YYYY-MM-DD)
  updatedAt: string;
}

export interface AlignmentUpdatePayload {
  didMorningCheckin?: boolean;
  didLogMeals?: boolean;
  didLogWorkout?: boolean;
  didInteractWithCircle?: boolean;
  hasActiveGoal?: boolean;
}

export interface AlignmentState {
  alignment: UserAlignment | null;
  summary: UserAlignmentSummary | null;
  isLoading: boolean;
  error: string | null;
}

// Circle Alignment Types (renamed from Squad)
export interface CircleAlignmentDay {
  circleId: string;
  date: string; // "YYYY-MM-DD"
  fractionFullyAligned: number; // 0.0 to 1.0
  numFullyAligned: number;
  totalMembers: number;
  kept: boolean; // fractionFullyAligned >= 0.5
  createdAt: string;
  updatedAt: string;
}

// Legacy type alias
export type SquadAlignmentDay = CircleAlignmentDay;

export interface CircleAlignmentSummary {
  circleId: string;
  currentStreak: number; // consecutive kept days
  lastKeptDate?: string; // last date where >=50% fullyAligned
  updatedAt: string;
}

// Legacy type alias
export type SquadAlignmentSummary = CircleAlignmentSummary;

// Notification Types
export type NotificationType =
  | 'morning_checkin'
  | 'evening_checkin_complete_tasks'
  | 'evening_checkin_incomplete_tasks'
  | 'weekly_reflection'
  | 'circle_call_24h'
  | 'circle_call_1h'
  | 'circle_call_live';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  createdAt: string; // ISO timestamp
  read: boolean;
  actionRoute?: string; // e.g. "/checkin/morning/start"
}

export interface EmailNotificationPreferences {
  morning_checkin?: boolean;
  evening_checkin_complete_tasks?: boolean;
  evening_checkin_incomplete_tasks?: boolean;
  weekly_reflection?: boolean;
}

// Email Preferences for Settings Panel (simplified user-facing toggles)
export interface EmailPreferences {
  morningCheckIn: boolean;
  eveningCheckIn: boolean;
  weeklyReview: boolean;
  circleCall24h: boolean;
  circleCall1h: boolean;
}

export interface NotificationPreferences {
  email?: EmailNotificationPreferences;
}

// Premium Upgrade Form Types
export type PremiumPlanType = 'monthly' | 'sixMonth';

export interface PremiumUpgradeForm {
  id: string;
  userId: string;
  email: string;
  name: string;
  phone: string;
  priceId: string;
  planLabel: PremiumPlanType;
  benefitsSelected: string[];
  upgradeWithFriends: boolean;
  friendsNames: string | null;
  commitment: 'commit' | 'not_ready';
  stripeUpgradeSuccessful: boolean;
  createdAt: string;
}

// Coaching Intake Form Types
export type CoachingPlanType = 'monthly' | 'quarterly';

export interface CoachingIntakeForm {
  id: string;
  userId: string;
  email: string;
  name: string;
  phone: string;
  priceId: string;
  planLabel: CoachingPlanType;
  goalsSelected: string[]; // What they want from coaching
  coachPreference: string; // Selected coach or "no_preference"
  commitment: 'commit' | 'not_ready';
  stripeSubscriptionSuccessful: boolean;
  createdAt: string;
}

// ============================================================================
// 1:1 COACHING SYSTEM TYPES
// ============================================================================

// Coach profile information
export interface Coach {
  id: string; // Clerk user ID
  email: string;
  firstName: string;
  lastName: string;
  name: string; // Display name
  imageUrl: string;
  title?: string; // e.g., "Wellness Coach", "Nutrition Coach"
  bio?: string;
  linkedinUrl?: string;
  instagramHandle?: string;
  isActive: boolean; // Only active coaches can be assigned
  createdAt: string;
  updatedAt: string;
}

// Action item assigned by coach to client
export interface CoachingActionItem {
  id: string;
  text: string;
  completed: boolean;
  completedAt?: string;
  createdAt: string;
}

// Session history entry (visible to client)
export interface CoachingSessionHistory {
  id: string;
  date: string; // ISO date
  title: string;
  summary: string;
  takeaways: string[];
  createdAt: string;
  updatedAt: string;
}

// Resource shared by coach
export interface CoachingResource {
  id: string;
  title: string;
  url: string;
  description?: string;
  createdAt: string;
}

// Coach's private notes (not visible to client)
export interface CoachPrivateNotes {
  sessionId: string;
  notes: string;
  plannedTopics?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

// Next coaching call data
export interface CoachingCallData {
  datetime: string | null; // ISO timestamp
  timezone: string;
  location: string; // "chat", Zoom URL, etc.
  title?: string;
}

// Main client coaching data model
export interface ClientCoachingData {
  id: string; // Same as userId
  userId: string;
  coachId: string;
  coachingPlan: CoachingPlanType;
  startDate: string; // When coaching started
  focusAreas: string[]; // Current focus points (editable by coach)
  actionItems: CoachingActionItem[];
  nextCall: CoachingCallData;
  sessionHistory: CoachingSessionHistory[];
  resources: CoachingResource[];
  privateNotes: CoachPrivateNotes[]; // Coach-only
  chatChannelId?: string; // Stream Chat channel ID for 1:1 chat
  createdAt: string;
  updatedAt: string;
}

// Coaching call scheduled job (for notifications/emails)
export type CoachingCallJobType = 'notification_24h' | 'notification_1h' | 'notification_live' | 'email_24h' | 'email_1h';

export interface CoachingCallScheduledJob {
  id: string; // Format: `coaching_${userId}_${jobType}`
  userId: string;
  coachId: string;
  clientName: string;
  coachName: string;
  jobType: CoachingCallJobType;
  scheduledTime: string; // ISO timestamp when job should execute
  callDateTime: string; // ISO timestamp of the call
  callTimezone: string;
  callLocation: string;
  callTitle?: string;
  chatChannelId?: string;
  executed: boolean;
  executedAt?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

// Extended notification types for coaching
export type CoachingNotificationType =
  | 'coaching_call_24h'
  | 'coaching_call_1h'
  | 'coaching_call_live';

// Standard Circle Call Types (for non-premium circles)
export type StandardCircleCallStatus = 'pending' | 'confirmed' | 'canceled';
export type StandardCircleCallProposalType = 'new' | 'edit' | 'delete';

export interface StandardCircleCall {
  id: string;
  circleId: string;
  createdByUserId: string;
  status: StandardCircleCallStatus;
  proposalType: StandardCircleCallProposalType;
  startDateTimeUtc: string; // ISO 8601 timestamp
  timezone: string; // IANA timezone e.g. "America/New_York"
  location: string; // e.g. "Circle chat", "Zoom", a URL
  title: string; // e.g. "Circle accountability call"
  // For edit proposals, reference to the original call being edited
  originalCallId?: string;
  // Voting stats (denormalized for quick access)
  yesCount: number;
  noCount: number;
  requiredVotes: number; // floor(totalMembers / 2) + 1
  totalMembers: number;
  createdAt: string;
  updatedAt: string;
  confirmedAt?: string; // When call reached required votes
}

// Legacy type alias
export type StandardSquadCall = StandardCircleCall;

export interface CircleCallVote {
  id: string; // Format: `${callId}_${userId}`
  callId: string;
  circleId: string;
  userId: string;
  vote: 'yes' | 'no';
  createdAt: string;
  updatedAt: string;
}

// Legacy type alias
export type SquadCallVote = CircleCallVote;

// Circle Call Scheduled Job Types (for notifications and emails)
export type CircleCallJobType = 'notification_24h' | 'notification_1h' | 'notification_live' | 'email_24h' | 'email_1h';

// Legacy type alias
export type SquadCallJobType = CircleCallJobType;

export interface CircleCallScheduledJob {
  id: string; // Format: `${circleId}_${callId}_${jobType}` or `${circleId}_premium_${jobType}`
  circleId: string;
  circleName: string;
  isPremiumCircle: boolean;
  callId?: string; // For standard circles
  jobType: CircleCallJobType;
  scheduledTime: string; // ISO timestamp when job should execute
  callDateTime: string; // ISO timestamp of the call
  callTimezone: string;
  callLocation: string;
  callTitle: string;
  chatChannelId?: string;
  executed: boolean;
  executedAt?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

// Legacy type alias
export type SquadCallScheduledJob = CircleCallScheduledJob;

// Poll Types (re-export from poll.ts)
export * from './poll';
