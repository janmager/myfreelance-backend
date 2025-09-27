import { sql } from '../config/db.js';
import { stripe, STRIPE_CONFIG, getProductConfig } from '../config/stripe.js';

// Stripe webhook handler
export async function stripeWebhook(req, res) {
  const sig = req.headers['stripe-signature'];

  if (!sig) {
    console.error('Missing stripe signature');
    return res.status(400).json({ error: 'Missing signature' });
  }

  try {
    // Verify webhook signature
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      STRIPE_CONFIG.WEBHOOK_SECRET
    );

    console.log('Processing Stripe webhook:', event.type);

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object);
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
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
}

// Handle checkout session completed event
async function handleCheckoutSessionCompleted(session) {
  console.log('Processing checkout session completed:', session.id);
  
  try {
    // For Pricing Tables, we need to get customer info and subscription details
    if (session.customer && session.subscription) {
      // Get subscription details from Stripe
      const subscription = await stripe.subscriptions.retrieve(session.subscription);
      
      // Determine product name based on subscription items
      let productName = 'premium'; // default
      if (subscription.items.data.length > 0) {
        const priceId = subscription.items.data[0].price.id;
        // You can map price IDs to product names here
        // For now, we'll use a simple mapping based on your Stripe setup
        if (priceId.includes('gold') || priceId.includes('premium_2')) {
          productName = 'gold';
        }
      }

      // Get customer details to find user
      const customer = await stripe.customers.retrieve(session.customer);
      const userEmail = customer.email;

      if (!userEmail) {
        console.error('No email found for customer:', session.customer);
        return;
      }

      // Find user by email
      const user = await sql`
        SELECT * FROM users WHERE email = ${userEmail}
      `;

      if (user.length === 0) {
        console.error('User not found for email:', userEmail);
        return;
      }

      const userId = user[0].user_id;
      const productConfig = getProductConfig(productName);

      // Create or update subscription record
      await sql`
        INSERT INTO user_subscriptions (
          user_id,
          product_name,
          stripe_subscription_id,
          stripe_customer_id,
          stripe_checkout_session_id,
          status,
          current_period_start,
          current_period_end,
          expires_at,
          created_at,
          updated_at
        ) VALUES (
          ${userId},
          ${productName},
          ${session.subscription},
          ${session.customer},
          ${session.id},
          ${subscription.status},
          TO_TIMESTAMP(${subscription.current_period_start}),
          TO_TIMESTAMP(${subscription.current_period_end}),
          TO_TIMESTAMP(${subscription.current_period_end}),
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
        ON CONFLICT (user_id, product_name) 
        DO UPDATE SET
          stripe_subscription_id = ${session.subscription},
          stripe_customer_id = ${session.customer},
          stripe_checkout_session_id = ${session.id},
          status = ${subscription.status},
          current_period_start = TO_TIMESTAMP(${subscription.current_period_start}),
          current_period_end = TO_TIMESTAMP(${subscription.current_period_end}),
          expires_at = TO_TIMESTAMP(${subscription.current_period_end}),
          updated_at = CURRENT_TIMESTAMP
      `;

      // Update user premium level
      let newPremiumLevel = 0;
      if (subscription.status === 'active') {
        newPremiumLevel = productConfig.premiumLevel;
      }

      await sql`
        UPDATE users 
        SET 
          premium_level = ${newPremiumLevel},
          updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ${userId}
      `;

      console.log(`Updated user ${userId} to premium level ${newPremiumLevel} for product ${productName}`);
    }
  } catch (error) {
    console.error('Error handling checkout session completed:', error);
  }
}

// Handle subscription created event
async function handleSubscriptionCreated(subscription) {
  console.log('Processing subscription created:', subscription.id);
  
  try {
    const { user_id, product_name } = subscription.metadata;

    if (!user_id || !product_name) {
      console.error('Missing metadata in subscription:', subscription.id);
      return;
    }

    // Update subscription record
    await sql`
      UPDATE user_subscriptions 
      SET 
        stripe_subscription_id = ${subscription.id},
        stripe_customer_id = ${subscription.customer},
        current_period_start = TO_TIMESTAMP(${subscription.current_period_start}),
        current_period_end = TO_TIMESTAMP(${subscription.current_period_end}),
        expires_at = TO_TIMESTAMP(${subscription.current_period_end}),
        status = ${subscription.status},
        updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ${user_id} 
      AND product_name = ${product_name}
      AND status = 'active'
    `;

    console.log(`Updated subscription for user ${user_id}`);
  } catch (error) {
    console.error('Error handling subscription created:', error);
  }
}

// Handle subscription updated event
async function handleSubscriptionUpdated(subscription) {
  console.log('Processing subscription updated:', subscription.id);
  
  try {
    // Update subscription record
    await sql`
      UPDATE user_subscriptions 
      SET 
        current_period_start = TO_TIMESTAMP(${subscription.current_period_start}),
        current_period_end = TO_TIMESTAMP(${subscription.current_period_end}),
        expires_at = TO_TIMESTAMP(${subscription.current_period_end}),
        status = ${subscription.status},
        updated_at = CURRENT_TIMESTAMP
      WHERE stripe_subscription_id = ${subscription.id}
    `;

    // If subscription is cancelled, update user premium level
    if (subscription.status === 'canceled' || subscription.status === 'incomplete_expired') {
      const subscriptionRecord = await sql`
        SELECT user_id FROM user_subscriptions 
        WHERE stripe_subscription_id = ${subscription.id}
      `;

      if (subscriptionRecord.length > 0) {
        await sql`
          UPDATE users 
          SET 
            premium_level = 0,
            updated_at = CURRENT_TIMESTAMP
          WHERE user_id = ${subscriptionRecord[0].user_id}
        `;
      }
    }

    console.log(`Updated subscription ${subscription.id}`);
  } catch (error) {
    console.error('Error handling subscription updated:', error);
  }
}

// Handle subscription deleted event
async function handleSubscriptionDeleted(subscription) {
  console.log('Processing subscription deleted:', subscription.id);
  
  try {
    // Update subscription status
    await sql`
      UPDATE user_subscriptions 
      SET 
        status = 'cancelled',
        cancelled_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE stripe_subscription_id = ${subscription.id}
    `;

    // Update user premium level to 0
    const subscriptionRecord = await sql`
      SELECT user_id FROM user_subscriptions 
      WHERE stripe_subscription_id = ${subscription.id}
    `;

    if (subscriptionRecord.length > 0) {
      await sql`
        UPDATE users 
        SET 
          premium_level = 0,
          updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ${subscriptionRecord[0].user_id}
      `;
    }

    console.log(`Cancelled subscription ${subscription.id}`);
  } catch (error) {
    console.error('Error handling subscription deleted:', error);
  }
}

// Handle payment succeeded event
async function handlePaymentSucceeded(invoice) {
  console.log('Processing payment succeeded:', invoice.id);
  
  try {
    if (invoice.subscription) {
      // Update subscription renewal date
      const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
      
      await sql`
        UPDATE user_subscriptions 
        SET 
          current_period_start = TO_TIMESTAMP(${subscription.current_period_start}),
          current_period_end = TO_TIMESTAMP(${subscription.current_period_end}),
          expires_at = TO_TIMESTAMP(${subscription.current_period_end}),
          updated_at = CURRENT_TIMESTAMP
        WHERE stripe_subscription_id = ${invoice.subscription}
      `;

      console.log(`Updated renewal date for subscription ${invoice.subscription}`);
    }
  } catch (error) {
    console.error('Error handling payment succeeded:', error);
  }
}

// Handle payment failed event
async function handlePaymentFailed(invoice) {
  console.log('Processing payment failed:', invoice.id);
  
  try {
    if (invoice.subscription) {
      // You might want to implement retry logic or notify the user
      // For now, we'll just log the failure
      console.log(`Payment failed for subscription ${invoice.subscription}`);
      
      // Optionally, you could update the subscription status to indicate payment issues
      await sql`
        UPDATE user_subscriptions 
        SET 
          status = 'past_due',
          updated_at = CURRENT_TIMESTAMP
        WHERE stripe_subscription_id = ${invoice.subscription}
      `;
    }
  } catch (error) {
    console.error('Error handling payment failed:', error);
  }
}
