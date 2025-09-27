import { sql } from '../config/db.js';
import { stripe, STRIPE_CONFIG } from '../config/stripe.js';

// Stripe webhook handler
export async function stripeWebhook(req, res) {
  console.log('🔔 Webhook received:', req.headers['stripe-signature'] ? 'Signature present' : 'No signature');
  console.log('📦 Body type:', typeof req.body, 'Length:', req.body?.length);
  
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_CONFIG.WEBHOOK_SECRET);
    console.log('✅ Webhook signature verified, event type:', event.type);
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err.message);
    console.error('🔍 Request body type:', typeof req.body);
    console.error('🔍 Request body length:', req.body?.length);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    // Handle the event
    console.log('🔄 Processing webhook event:', event.type);
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object);
        break;
      
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object);
        break;
      
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object);
        break;
      
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object);
        break;
      
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
      
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
}

// Handle successful checkout session
async function handleCheckoutSessionCompleted(session) {
  console.log('🔄 Processing checkout.session.completed:', session.id);
  console.log('📋 Session metadata:', session.metadata);
  
  const { user_id, product_name } = session.metadata;
  
  if (!user_id || !product_name) {
    console.error('❌ Missing metadata in checkout session:', session.id);
    return;
  }
  
  console.log(`👤 Processing payment for user: ${user_id}, product: ${product_name}`);

  try {
    // Update payment record
    const updateResult = await sql`
      UPDATE user_payments 
      SET 
        stripe_payment_intent_id = ${session.payment_intent},
        status = 'succeeded',
        paid_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ${user_id} 
      AND stripe_customer_id = ${session.customer}
      AND status = 'pending'
    `;
    
    console.log(`💾 Updated payment record for user ${user_id}:`, updateResult.length > 0 ? 'Success' : 'No records updated');

    // Update user premium level
    const premiumLevel = product_name === 'gold' ? 2 : 1;
    const userUpdateResult = await sql`
      UPDATE users 
      SET 
        premium_level = ${premiumLevel},
        updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ${user_id}
    `;
    
    console.log(`👤 Updated user ${user_id} to premium level ${premiumLevel}:`, userUpdateResult.length > 0 ? 'Success' : 'No records updated');
  } catch (error) {
    console.error('❌ Error handling checkout session completed:', error);
  }
}

// Handle successful invoice payment
async function handleInvoicePaymentSucceeded(invoice) {
  console.log('Processing invoice.payment_succeeded:', invoice.id);
  
  if (!invoice.subscription) return;

  try {
    // Get subscription details
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
    const { user_id, product_name } = subscription.metadata;

    if (!user_id || !product_name) {
      console.error('Missing metadata in subscription:', subscription.id);
      return;
    }

    // Create new payment record for recurring payment
    await sql`
      INSERT INTO user_payments (
        user_id,
        stripe_subscription_id,
        stripe_customer_id,
        product_name,
        amount,
        currency,
        status,
        payment_method,
        created_at,
        paid_at,
        subscription_start_date,
        subscription_end_date
      ) VALUES (
        ${user_id},
        ${subscription.id},
        ${invoice.customer},
        ${product_name},
        ${invoice.amount_paid},
        ${invoice.currency},
        'succeeded',
        'card',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP,
        TO_TIMESTAMP(${subscription.current_period_start}),
        TO_TIMESTAMP(${subscription.current_period_end})
      )
    `;

    console.log(`Recorded recurring payment for user ${user_id}`);
  } catch (error) {
    console.error('Error handling invoice payment succeeded:', error);
  }
}

// Handle failed invoice payment
async function handleInvoicePaymentFailed(invoice) {
  console.log('Processing invoice.payment_failed:', invoice.id);
  
  if (!invoice.subscription) return;

  try {
    // Get subscription details
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
    const { user_id } = subscription.metadata;

    if (!user_id) {
      console.error('Missing user_id in subscription metadata:', subscription.id);
      return;
    }

    // Create failed payment record
    await sql`
      INSERT INTO user_payments (
        user_id,
        stripe_subscription_id,
        stripe_customer_id,
        product_name,
        amount,
        currency,
        status,
        created_at
      ) VALUES (
        ${user_id},
        ${subscription.id},
        ${invoice.customer},
        'premium',
        ${invoice.amount_due},
        ${invoice.currency},
        'failed',
        CURRENT_TIMESTAMP
      )
    `;

    console.log(`Recorded failed payment for user ${user_id}`);
  } catch (error) {
    console.error('Error handling invoice payment failed:', error);
  }
}

// Handle subscription creation
async function handleSubscriptionCreated(subscription) {
  console.log('Processing customer.subscription.created:', subscription.id);
  
  const { user_id, product_name } = subscription.metadata;
  
  if (!user_id || !product_name) {
    console.error('Missing metadata in subscription:', subscription.id);
    return;
  }

  try {
    // Update payment record with subscription details
    await sql`
      UPDATE user_payments 
      SET 
        stripe_subscription_id = ${subscription.id},
        subscription_start_date = TO_TIMESTAMP(${subscription.current_period_start}),
        subscription_end_date = TO_TIMESTAMP(${subscription.current_period_end}),
        updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ${user_id} 
      AND stripe_customer_id = ${subscription.customer}
      AND stripe_subscription_id IS NULL
    `;

    console.log(`Updated subscription details for user ${user_id}`);
  } catch (error) {
    console.error('Error handling subscription created:', error);
  }
}

// Handle subscription update
async function handleSubscriptionUpdated(subscription) {
  console.log('Processing customer.subscription.updated:', subscription.id);
  
  const { user_id } = subscription.metadata;
  
  if (!user_id) {
    console.error('Missing user_id in subscription metadata:', subscription.id);
    return;
  }

  try {
    // Update subscription details
    await sql`
      UPDATE user_payments 
      SET 
        subscription_start_date = TO_TIMESTAMP(${subscription.current_period_start}),
        subscription_end_date = TO_TIMESTAMP(${subscription.current_period_end}),
        status = ${subscription.status},
        updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ${user_id} 
      AND stripe_subscription_id = ${subscription.id}
    `;

    console.log(`Updated subscription status for user ${user_id}`);
  } catch (error) {
    console.error('Error handling subscription updated:', error);
  }
}

// Handle subscription deletion
async function handleSubscriptionDeleted(subscription) {
  console.log('Processing customer.subscription.deleted:', subscription.id);
  
  const { user_id } = subscription.metadata;
  
  if (!user_id) {
    console.error('Missing user_id in subscription metadata:', subscription.id);
    return;
  }

  try {
    // Update payment status
    await sql`
      UPDATE user_payments 
      SET 
        status = 'canceled',
        updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ${user_id} 
      AND stripe_subscription_id = ${subscription.id}
    `;

    // Reset user premium level to 0 (free)
    await sql`
      UPDATE users 
      SET 
        premium_level = 0,
        updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ${user_id}
    `;

    console.log(`Canceled subscription and reset premium level for user ${user_id}`);
  } catch (error) {
    console.error('Error handling subscription deleted:', error);
  }
}
