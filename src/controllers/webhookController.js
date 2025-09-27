import { sql } from '../config/db.js';
import { lemonSqueezy, getSubscription, LEMONSQUEEZY_CONFIG, getProductConfig } from '../config/lemonsqueezy.js';
import crypto from 'crypto';

// Lemon Squeezy webhook handler
export async function lemonSqueezyWebhook(req, res) {
  const sig = req.headers['x-signature'];
  const rawBody = req.body;

  if (!sig) {
    return res.status(400).json({ error: 'Missing signature' });
  }

  try {
    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', LEMONSQUEEZY_CONFIG.WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex');

    if (sig !== expectedSignature) {
      console.error('Invalid webhook signature');
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const event = JSON.parse(rawBody);
    console.log('Processing Lemon Squeezy webhook:', event.meta.event_name);

    // Handle the event
    switch (event.meta.event_name) {
      case 'order_created':
        await handleOrderCreated(event.data);
        break;
      case 'subscription_created':
        await handleSubscriptionCreated(event.data);
        break;
      case 'subscription_updated':
        await handleSubscriptionUpdated(event.data);
        break;
      case 'subscription_cancelled':
        await handleSubscriptionCancelled(event.data);
        break;
      case 'subscription_resumed':
        await handleSubscriptionResumed(event.data);
        break;
      case 'subscription_expired':
        await handleSubscriptionExpired(event.data);
        break;
      case 'subscription_paused':
        await handleSubscriptionPaused(event.data);
        break;
      case 'subscription_unpaused':
        await handleSubscriptionUnpaused(event.data);
        break;
      case 'subscription_payment_success':
        await handleSubscriptionPaymentSuccess(event.data);
        break;
      case 'subscription_payment_failed':
        await handleSubscriptionPaymentFailed(event.data);
        break;
      default:
        console.log(`Unhandled event type: ${event.meta.event_name}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
}

// Handle order created event
async function handleOrderCreated(orderData) {
  console.log('Processing order created:', orderData.id);
  
  try {
    // Get order details from Lemon Squeezy
    const order = await lemonSqueezy.getOrder({ id: orderData.id });
    const orderAttributes = order.data.attributes;
    
    // Extract custom data (user_id and product_name)
    const customData = orderAttributes.first_order_item?.product_options?.custom_data || {};
    const { user_id, product_name } = customData;

    if (!user_id || !product_name) {
      console.error('Missing custom data in order:', orderData.id);
      return;
    }

    // Get product configuration
    const productConfig = getProductConfig(product_name);

    // Update or create subscription record
    await sql`
      INSERT INTO user_subscriptions (
        user_id,
        product_name,
        lemon_squeezy_variant_id,
        lemon_squeezy_order_id,
        lemon_squeezy_checkout_id,
        status,
        created_at,
        updated_at
      ) VALUES (
        ${user_id},
        ${product_name},
        ${productConfig.variantId},
        ${orderData.id},
        ${orderAttributes.identifier},
        'active',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
      ON CONFLICT (user_id, product_name) 
      DO UPDATE SET
        lemon_squeezy_order_id = ${orderData.id},
        lemon_squeezy_checkout_id = ${orderAttributes.identifier},
        status = 'active',
        updated_at = CURRENT_TIMESTAMP
    `;

    // Update user premium level
    await sql`
      UPDATE users 
      SET 
        premium_level = ${productConfig.premiumLevel},
        updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ${user_id}
    `;

    console.log(`Updated user ${user_id} to premium level ${productConfig.premiumLevel}`);
  } catch (error) {
    console.error('Error handling order created:', error);
  }
}

// Handle subscription created event
async function handleSubscriptionCreated(subscriptionData) {
  console.log('Processing subscription created:', subscriptionData.id);
  
  try {
    // Get subscription details from Lemon Squeezy
    const subscription = await getSubscription(subscriptionData.id);
    const subAttributes = subscription.data.attributes;
    
    // Extract custom data
    const customData = subAttributes.custom_data || {};
    const { user_id, product_name } = customData;

    if (!user_id || !product_name) {
      console.error('Missing custom data in subscription:', subscriptionData.id);
      return;
    }

    // Update subscription record
    await sql`
      UPDATE user_subscriptions 
      SET 
        lemon_squeezy_subscription_id = ${subscriptionData.id},
        status = 'active',
        expires_at = TO_TIMESTAMP(${subAttributes.renews_at}),
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
async function handleSubscriptionUpdated(subscriptionData) {
  console.log('Processing subscription updated:', subscriptionData.id);
  
  try {
    const subscription = await getSubscription(subscriptionData.id);
    const subAttributes = subscription.data.attributes;

    // Update subscription record
    await sql`
      UPDATE user_subscriptions 
      SET 
        status = ${subAttributes.status},
        expires_at = TO_TIMESTAMP(${subAttributes.renews_at}),
        updated_at = CURRENT_TIMESTAMP
      WHERE lemon_squeezy_subscription_id = ${subscriptionData.id}
    `;

    // If subscription is cancelled, update user premium level
    if (subAttributes.status === 'cancelled') {
      const subscriptionRecord = await sql`
        SELECT user_id FROM user_subscriptions 
        WHERE lemon_squeezy_subscription_id = ${subscriptionData.id}
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

    console.log(`Updated subscription ${subscriptionData.id}`);
  } catch (error) {
    console.error('Error handling subscription updated:', error);
  }
}

// Handle subscription cancelled event
async function handleSubscriptionCancelled(subscriptionData) {
  console.log('Processing subscription cancelled:', subscriptionData.id);
  
  try {
    // Update subscription status
    await sql`
      UPDATE user_subscriptions 
      SET 
        status = 'cancelled',
        cancelled_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE lemon_squeezy_subscription_id = ${subscriptionData.id}
    `;

    // Update user premium level to 0
    const subscriptionRecord = await sql`
      SELECT user_id FROM user_subscriptions 
      WHERE lemon_squeezy_subscription_id = ${subscriptionData.id}
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

    console.log(`Cancelled subscription ${subscriptionData.id}`);
  } catch (error) {
    console.error('Error handling subscription cancelled:', error);
  }
}

// Handle subscription resumed event
async function handleSubscriptionResumed(subscriptionData) {
  console.log('Processing subscription resumed:', subscriptionData.id);
  
  try {
    const subscription = await getSubscription(subscriptionData.id);
    const subAttributes = subscription.data.attributes;

    // Update subscription status
    await sql`
      UPDATE user_subscriptions 
      SET 
        status = 'active',
        expires_at = TO_TIMESTAMP(${subAttributes.renews_at}),
        updated_at = CURRENT_TIMESTAMP
      WHERE lemon_squeezy_subscription_id = ${subscriptionData.id}
    `;

    // Get product configuration and update user premium level
    const subscriptionRecord = await sql`
      SELECT user_id, product_name FROM user_subscriptions 
      WHERE lemon_squeezy_subscription_id = ${subscriptionData.id}
    `;

    if (subscriptionRecord.length > 0) {
      const { user_id, product_name } = subscriptionRecord[0];
      const productConfig = getProductConfig(product_name);

      await sql`
        UPDATE users 
        SET 
          premium_level = ${productConfig.premiumLevel},
          updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ${user_id}
      `;
    }

    console.log(`Resumed subscription ${subscriptionData.id}`);
  } catch (error) {
    console.error('Error handling subscription resumed:', error);
  }
}

// Handle subscription expired event
async function handleSubscriptionExpired(subscriptionData) {
  console.log('Processing subscription expired:', subscriptionData.id);
  
  try {
    // Update subscription status
    await sql`
      UPDATE user_subscriptions 
      SET 
        status = 'expired',
        updated_at = CURRENT_TIMESTAMP
      WHERE lemon_squeezy_subscription_id = ${subscriptionData.id}
    `;

    // Update user premium level to 0
    const subscriptionRecord = await sql`
      SELECT user_id FROM user_subscriptions 
      WHERE lemon_squeezy_subscription_id = ${subscriptionData.id}
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

    console.log(`Expired subscription ${subscriptionData.id}`);
  } catch (error) {
    console.error('Error handling subscription expired:', error);
  }
}

// Handle subscription paused event
async function handleSubscriptionPaused(subscriptionData) {
  console.log('Processing subscription paused:', subscriptionData.id);
  
  try {
    await sql`
      UPDATE user_subscriptions 
      SET 
        status = 'paused',
        updated_at = CURRENT_TIMESTAMP
      WHERE lemon_squeezy_subscription_id = ${subscriptionData.id}
    `;

    console.log(`Paused subscription ${subscriptionData.id}`);
  } catch (error) {
    console.error('Error handling subscription paused:', error);
  }
}

// Handle subscription unpaused event
async function handleSubscriptionUnpaused(subscriptionData) {
  console.log('Processing subscription unpaused:', subscriptionData.id);
  
  try {
    const subscription = await getSubscription(subscriptionData.id);
    const subAttributes = subscription.data.attributes;

    await sql`
      UPDATE user_subscriptions 
      SET 
        status = 'active',
        expires_at = TO_TIMESTAMP(${subAttributes.renews_at}),
        updated_at = CURRENT_TIMESTAMP
      WHERE lemon_squeezy_subscription_id = ${subscriptionData.id}
    `;

    console.log(`Unpaused subscription ${subscriptionData.id}`);
  } catch (error) {
    console.error('Error handling subscription unpaused:', error);
  }
}

// Handle subscription payment success event
async function handleSubscriptionPaymentSuccess(paymentData) {
  console.log('Processing subscription payment success:', paymentData.id);
  
  try {
    const subscription = await getSubscription(paymentData.attributes.subscription_id);
    const subAttributes = subscription.data.attributes;

    // Update subscription renewal date
    await sql`
      UPDATE user_subscriptions 
      SET 
        expires_at = TO_TIMESTAMP(${subAttributes.renews_at}),
        updated_at = CURRENT_TIMESTAMP
      WHERE lemon_squeezy_subscription_id = ${paymentData.attributes.subscription_id}
    `;

    console.log(`Updated renewal date for subscription ${paymentData.attributes.subscription_id}`);
  } catch (error) {
    console.error('Error handling subscription payment success:', error);
  }
}

// Handle subscription payment failed event
async function handleSubscriptionPaymentFailed(paymentData) {
  console.log('Processing subscription payment failed:', paymentData.id);
  
  try {
    // You might want to implement retry logic or notify the user
    // For now, we'll just log the failure
    console.log(`Payment failed for subscription ${paymentData.attributes.subscription_id}`);
  } catch (error) {
    console.error('Error handling subscription payment failed:', error);
  }
}
