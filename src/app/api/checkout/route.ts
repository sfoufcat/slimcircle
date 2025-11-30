import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminDb } from '@/lib/firebase-admin';

// Lazy initialization of Stripe to avoid build-time errors
function getStripeClient(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  return new Stripe(key, {
    apiVersion: '2025-02-24.acacia',
  });
}

// Price IDs from environment variables
const PRICE_IDS: Record<string, string | undefined> = {
  standard_monthly: process.env.STRIPE_STANDARD_MONTHLY_PRICE_ID,
  premium_monthly: process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID,
  standard_halfyear: process.env.STRIPE_STANDARD_HALF_YEAR_PRICE_ID,
  premium_halfyear: process.env.STRIPE_PREMIUM_HALF_YEAR_PRICE_ID,
};

/**
 * POST /api/checkout
 * Creates a Stripe Checkout Session for subscription
 */
export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const stripe = getStripeClient();
    const body = await req.json();
    const { plan, billingPeriod = 'monthly', inviteToken } = body;

    // Validate plan
    if (!plan || !['standard', 'premium'].includes(plan)) {
      return NextResponse.json({ error: 'Invalid plan selected' }, { status: 400 });
    }

    // Get price ID
    const priceKey = `${plan}_${billingPeriod}`;
    const priceId = PRICE_IDS[priceKey];

    if (!priceId) {
      console.error(`Missing price ID for: ${priceKey}`);
      return NextResponse.json(
        { error: 'Price configuration error. Please contact support.' }, 
        { status: 500 }
      );
    }

    // Get user data from Firestore
    const userDoc = await adminDb.collection('users').doc(userId).get();
    const userData = userDoc.data();
    const userEmail = userData?.email;

    // Check if user already has a Stripe customer ID
    let customerId = userData?.billing?.stripeCustomerId;

    if (!customerId && userEmail) {
      // Check if customer exists by email
      const existingCustomers = await stripe.customers.list({
        email: userEmail,
        limit: 1,
      });

      if (existingCustomers.data.length > 0) {
        customerId = existingCustomers.data[0].id;
      } else {
        // Create new customer
        const customer = await stripe.customers.create({
          email: userEmail,
          metadata: {
            userId: userId,
          },
        });
        customerId = customer.id;
      }

      // Save customer ID to Firestore
      await adminDb.collection('users').doc(userId).set({
        billing: {
          stripeCustomerId: customerId,
        },
      }, { merge: true });
    }

    // Build checkout session parameters
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/onboarding/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/onboarding/plan?checkout=canceled`,
      metadata: {
        userId: userId,
        plan: plan,
        inviteToken: inviteToken || '',
      },
      subscription_data: {
        metadata: {
          userId: userId,
          plan: plan,
          inviteToken: inviteToken || '',
        },
      },
    };

    // Add customer if we have one
    if (customerId) {
      sessionParams.customer = customerId;
    } else if (userEmail) {
      sessionParams.customer_email = userEmail;
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create(sessionParams);

    return NextResponse.json({ url: session.url });

  } catch (error: any) {
    console.error('[CHECKOUT_ERROR]', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' }, 
      { status: 500 }
    );
  }
}

