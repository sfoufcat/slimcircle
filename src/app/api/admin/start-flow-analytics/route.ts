import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { adminDb } from '@/lib/firebase-admin';
import { isAdmin } from '@/lib/admin-utils-shared';
import type { UserRole } from '@/types';

// Step order for calculating funnel progression
const STEP_ORDER = [
  'start',
  'workday',
  'obstacles',
  'business-stage',
  'transformation',
  'identity',
  'goal',
  'goal-impact',
  'support-needs',
  'commitment',
  'plan',
  'profile',
  'analyzing',
  'success',
  'welcome',
  'create-account',
  'complete',
];

// Human-readable step names
const STEP_LABELS: Record<string, string> = {
  'start': 'Landing Page',
  'workday': 'Workday Style',
  'obstacles': 'Obstacles',
  'business-stage': 'Business Stage',
  'transformation': 'Transformation',
  'identity': 'Identity',
  'goal': 'Goal Setting',
  'goal-impact': 'Goal Impact',
  'support-needs': 'Support Needs',
  'commitment': 'Commitment',
  'plan': 'Plan Selection',
  'profile': 'Profile Info',
  'analyzing': 'Analyzing',
  'success': 'Success',
  'welcome': 'Welcome',
  'create-account': 'Create Account',
  'complete': 'Complete',
};

interface GuestSession {
  sessionId: string;
  currentStep?: string;
  createdAt?: string;
  updatedAt?: string;
  // User info
  firstName?: string;
  lastName?: string;
  email?: string;
  // Geo tracking
  country?: string;
  // Quiz answers
  workdayStyle?: string;
  peerAccountability?: string;
  businessStage?: string;
  goalImpact?: string[];
  supportNeeds?: string[];
  // Mission & Goal
  mission?: string;
  goal?: string;
  goalTargetDate?: string;
  // Commitment
  accountability?: boolean;
  readyToInvest?: boolean;
  // Plan
  selectedPlan?: string;
  paymentStatus?: string;
}

interface FunnelStep {
  step: string;
  label: string;
  count: number;
  dropOffCount: number;
  dropOffRate: number;
  cumulativeRate: number;
}

/**
 * GET /api/admin/start-flow-analytics
 * Returns funnel analytics and individual session data
 */
export async function GET(req: Request) {
  try {
    // Auth check
    const { sessionClaims } = await auth();
    const role = (sessionClaims?.publicMetadata as any)?.role as UserRole;
    
    if (!isAdmin(role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Parse query params
    const { searchParams } = new URL(req.url);
    const timeRange = searchParams.get('timeRange') || 'all'; // 'today', 'yesterday', '7d', '30d', 'all'

    // Calculate date filter
    let dateFilter: Date | null = null;
    let dateFilterEnd: Date | null = null; // For 'yesterday' we need a range
    
    if (timeRange === 'today') {
      dateFilter = new Date();
      dateFilter.setHours(0, 0, 0, 0);
    } else if (timeRange === 'yesterday') {
      dateFilter = new Date();
      dateFilter.setDate(dateFilter.getDate() - 1);
      dateFilter.setHours(0, 0, 0, 0);
      dateFilterEnd = new Date();
      dateFilterEnd.setHours(0, 0, 0, 0);
    } else if (timeRange === '7d') {
      dateFilter = new Date();
      dateFilter.setDate(dateFilter.getDate() - 7);
    } else if (timeRange === '30d') {
      dateFilter = new Date();
      dateFilter.setDate(dateFilter.getDate() - 30);
    }

    // Fetch all guest sessions
    const query = adminDb.collection('guestSessions').orderBy('createdAt', 'desc');
    
    const snapshot = await query.get();
    
    // Process sessions
    let sessions: GuestSession[] = snapshot.docs.map(doc => ({
      sessionId: doc.id,
      ...doc.data(),
    })) as GuestSession[];

    // Apply date filter if specified
    if (dateFilter) {
      sessions = sessions.filter(session => {
        if (!session.createdAt) return false;
        const sessionDate = new Date(session.createdAt);
        // If we have an end date (for 'yesterday'), filter within range
        if (dateFilterEnd) {
          return sessionDate >= dateFilter! && sessionDate < dateFilterEnd;
        }
        return sessionDate >= dateFilter!;
      });
    }

    // Calculate funnel metrics
    const stepCounts: Record<string, number> = {};
    STEP_ORDER.forEach(step => {
      stepCounts[step] = 0;
    });

    // Count sessions at each step (sessions that reached at least this step)
    sessions.forEach(session => {
      const currentStep = session.currentStep || 'start';
      const stepIndex = STEP_ORDER.indexOf(currentStep);
      
      // Count this session for all steps up to and including current step
      for (let i = 0; i <= stepIndex && i < STEP_ORDER.length; i++) {
        stepCounts[STEP_ORDER[i]]++;
      }
    });

    // Build funnel data
    const totalSessions = sessions.length;
    const funnel: FunnelStep[] = STEP_ORDER.map((step, index) => {
      const count = stepCounts[step];
      const previousCount = index > 0 ? stepCounts[STEP_ORDER[index - 1]] : totalSessions;
      const dropOffCount = previousCount - count;
      const dropOffRate = previousCount > 0 ? (dropOffCount / previousCount) * 100 : 0;
      const cumulativeRate = totalSessions > 0 ? (count / totalSessions) * 100 : 0;

      return {
        step,
        label: STEP_LABELS[step] || step,
        count,
        dropOffCount,
        dropOffRate: Math.round(dropOffRate * 10) / 10,
        cumulativeRate: Math.round(cumulativeRate * 10) / 10,
      };
    });

    // Calculate summary stats
    const completedSessions = stepCounts['complete'] || 0;
    const conversionRate = totalSessions > 0 
      ? Math.round((completedSessions / totalSessions) * 1000) / 10 
      : 0;

    // Format individual sessions for the table
    const formattedSessions = sessions.map(session => {
      const stepIndex = STEP_ORDER.indexOf(session.currentStep || 'start');
      return {
        sessionId: session.sessionId,
        createdAt: session.createdAt || null,
        updatedAt: session.updatedAt || null,
        currentStep: session.currentStep || 'start',
        currentStepLabel: STEP_LABELS[session.currentStep || 'start'] || session.currentStep || 'start',
        stepIndex,
        // Geo tracking
        country: session.country || null,
        // User info
        firstName: session.firstName || null,
        lastName: session.lastName || null,
        email: session.email || null,
        // Quiz answers
        workdayStyle: session.workdayStyle || null,
        businessStage: session.businessStage || null,
        goalImpact: session.goalImpact || null,
        supportNeeds: session.supportNeeds || null,
        // Mission & Goal
        mission: session.mission || null,
        goal: session.goal || null,
        goalTargetDate: session.goalTargetDate || null,
        // Commitment
        accountability: session.accountability ?? null,
        readyToInvest: session.readyToInvest ?? null,
        // Plan
        selectedPlan: session.selectedPlan || null,
        paymentStatus: session.paymentStatus || null,
      };
    });

    return NextResponse.json({
      summary: {
        totalSessions,
        completedSessions,
        conversionRate,
        timeRange,
      },
      funnel,
      sessions: formattedSessions,
      stepOrder: STEP_ORDER,
      stepLabels: STEP_LABELS,
    });
  } catch (error) {
    console.error('[START_FLOW_ANALYTICS]', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}

