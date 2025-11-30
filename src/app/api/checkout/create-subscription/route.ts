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
 * POST /api/checkout/create-subscription
 * Creates a Stripe subscription with incomplete payment for embedded checkout
 * Returns the client secret for the PaymentIntent
 * 
 * This is used for embedded Stripe Elements checkout (no redirect)
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { plan, email, firstName, lastName, guestSessionId, billingPeriod = 'monthly' } = body;

    // Validate required fields
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    if (!guestSessionId) {
      return NextResponse.json({ error: 'Guest session ID is required' }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    // Validate plan
    if (!plan || !['standard', 'premium'].includes(plan)) {
      return NextResponse.json({ error: 'Invalid plan selected' }, { status: 400 });
    }

    // Validate guest session exists
    const guestDoc = await adminDb.collection('guestSessions').doc(guestSessionId).get();
    if (!guestDoc.exists) {
      return NextResponse.json({ error: 'Invalid guest session' }, { status: 400 });
    }

    const stripe = getStripeClient();

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

    // Create or get existing customer
    let customer: Stripe.Customer;
    const existingCustomers = await stripe.customers.list({
      email: email,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0];
      // Update customer name if provided and different
      const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
      if (fullName && customer.name !== fullName) {
        customer = await stripe.customers.update(customer.id, { name: fullName });
      }
    } else {
      // Create new customer
      const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
      customer = await stripe.customers.create({
        email: email,
        name: fullName || undefined,
        metadata: {
          guestSessionId: guestSessionId,
        },
      });
    }

    // Create subscription with incomplete payment
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { 
        save_default_payment_method: 'on_subscription',
      },
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        guestSessionId: guestSessionId,
        plan: plan,
        isGuestCheckout: 'true',
      },
    });

    // Get the client secret from the payment intent
    const invoice = subscription.latest_invoice as Stripe.Invoice;
    const paymentIntent = invoice.payment_intent as Stripe.PaymentIntent;

    if (!paymentIntent?.client_secret) {
      throw new Error('Failed to create payment intent');
    }

    // Update PaymentIntent metadata with guestSessionId for verification
    await stripe.paymentIntents.update(paymentIntent.id, {
      metadata: {
        guestSessionId: guestSessionId,
        plan: plan,
        isGuestCheckout: 'true',
      },
    });

    // Update guest session with subscription info
    await adminDb.collection('guestSessions').doc(guestSessionId).set({
      email,
      firstName,
      lastName,
      selectedPlan: plan,
      stripeCustomerId: customer.id,
      stripeSubscriptionId: subscription.id,
      paymentStatus: 'pending',
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    return NextResponse.json({
      subscriptionId: subscription.id,
      clientSecret: paymentIntent.client_secret,
      customerId: customer.id,
    });

  } catch (error: any) {
    console.error('[CREATE_SUBSCRIPTION_ERROR]', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create subscription' },
      { status: 500 }
    );
  }
}

