import cron from "cron";
import https from "https";
import { API_URL, sql } from "./db.js";
import { stripe, getProductConfig } from "./stripe.js";

// for active state render server (going to sleep after 15min of disactive)
export const wakeupJob = new cron.CronJob("*/14 * * * *", function () {
  const now = new Date();
  const gmtPlus2 = new Date(now.getTime() + (2 * 60 * 60 * 1000)); // GMT+2
  const timeString = `[${gmtPlus2.getHours().toString().padStart(2, '0')}:${gmtPlus2.getMinutes().toString().padStart(2, '0')} ${gmtPlus2.getDate().toString().padStart(2, '0')}.${(gmtPlus2.getMonth() + 1).toString().padStart(2, '0')}.${gmtPlus2.getFullYear()}]`;
  
  https
    .get(API_URL+'/api/health', (res) => {
      console.log(`[CRON] ${timeString} | Health check sent`);
    })
    .on("error", (e) => console.error(`[CRON] ${timeString} | Error while sending request`, e));
});

// Function to check subscription status with Stripe
async function checkSubscriptionStatus() {
  try {
    console.log('[CRON] Checking subscription statuses...');
    
    // Get all active subscriptions
    const subscriptions = await sql`
      SELECT * FROM user_subscriptions 
      WHERE status = 'active' 
      AND stripe_subscription_id IS NOT NULL
    `;

    for (const subscription of subscriptions) {
      try {
        // Get subscription details from Stripe
        const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id);
        // Check if subscription status has changed
        if (true) {
        // if (stripeSubscription.status !== subscription.status) {
          console.log(`[CRON] Updating subscription ${subscription.subscription_id} status from ${subscription.status} to ${stripeSubscription.status}`);
          
          // Update subscription status in database
          await sql`
            UPDATE user_subscriptions 
            SET 
              status = ${stripeSubscription.status},
              current_period_start = TO_TIMESTAMP(${stripeSubscription.current_period_start}),
              current_period_end = TO_TIMESTAMP(${stripeSubscription.current_period_end}),
              expires_at = TO_TIMESTAMP(${stripeSubscription.current_period_end}),
              updated_at = CURRENT_TIMESTAMP
            WHERE subscription_id = ${subscription.subscription_id}
          `;

          // Update user premium level based on subscription status
          let newPremiumLevel = 0;
          if (stripeSubscription.status === 'active' && stripeSubscription.items.data[0].plan.product) {
            // Set premium level based on subscription name
            if (['prod_T8JL6cxSFNO4as', 'prod_T8JKy9wh4jDoGZ'].includes(stripeSubscription.items.data[0].plan.product)) {
              newPremiumLevel = 2;
            } else if (['prod_T8JKtN7ZLYZ8RX', 'prod_T8JJjuwRTUK1bb'].includes(stripeSubscription.items.data[0].plan.product)) {
              newPremiumLevel = 1;
            } else {
              // Fallback to premium level 1 for any other active subscription
              newPremiumLevel = 1;
            }
            console.log(`Setting premium level to ${newPremiumLevel} for subscription name: ${stripeSubscription.name}`);
          }

          await sql`
            UPDATE users 
            SET 
              premium_level = ${newPremiumLevel},
              updated_at = CURRENT_TIMESTAMP
            WHERE user_id = ${subscription.user_id}
          `;

          console.log(`[CRON] Updated user ${subscription.user_id} premium level to ${newPremiumLevel}`);
        }

        // Update subscription dates and premium level even if status hasn't changed
        if (stripeSubscription.current_period_end) {
          await sql`
            UPDATE user_subscriptions 
            SET 
              current_period_start = TO_TIMESTAMP(${stripeSubscription.current_period_start}),
              current_period_end = TO_TIMESTAMP(${stripeSubscription.current_period_end}),
              expires_at = TO_TIMESTAMP(${stripeSubscription.current_period_end}),
              updated_at = CURRENT_TIMESTAMP
            WHERE subscription_id = ${subscription.subscription_id}
          `;

          // Always update premium level based on current Stripe subscription status
          let newPremiumLevel = 0;
          if (stripeSubscription.status === 'active') {
            // Set premium level based on subscription name
            if (['prod_T8JL6cxSFNO4as', 'prod_T8JKy9wh4jDoGZ'].includes(stripeSubscription.items.data[0].plan.product)) {
              newPremiumLevel = 2;
            } else if (['prod_T8JKtN7ZLYZ8RX', 'prod_T8JJjuwRTUK1bb'].includes(stripeSubscription.items.data[0].plan.product)) {
              newPremiumLevel = 1;
            } else {
              // Fallback to premium level 1 for any other active subscription
              newPremiumLevel = 1;
            }
          }

          await sql`
            UPDATE users 
            SET 
              premium_level = ${newPremiumLevel},
              updated_at = CURRENT_TIMESTAMP
            WHERE user_id = ${subscription.user_id}
          `;

          console.log(`[CRON] Updated user ${subscription.user_id} premium level to ${newPremiumLevel} (status: ${stripeSubscription.status})`);
        }

      } catch (stripeError) {
        console.error(`[CRON] Error checking subscription ${subscription.subscription_id}:`, stripeError.message);
        
        // If subscription doesn't exist in Stripe anymore, mark as cancelled
        if (stripeError.type === 'StripeInvalidRequestError') {
          await sql`
            UPDATE user_subscriptions 
            SET 
              status = 'cancelled',
              updated_at = CURRENT_TIMESTAMP
            WHERE subscription_id = ${subscription.subscription_id}
          `;

          await sql`
            UPDATE users 
            SET 
              premium_level = 0,
              updated_at = CURRENT_TIMESTAMP
            WHERE user_id = ${subscription.user_id}
          `;

          console.log(`[CRON] Marked subscription ${subscription.subscription_id} as cancelled (not found in Stripe)`);
        }
      }
    }

    console.log(`[CRON] Checked ${subscriptions.length} subscriptions`);
  } catch (error) {
    console.error('[CRON] Error in subscription check:', error);
  }
}

// Cron job to check subscription status every hour
export const subscriptionCheckJob = new cron.CronJob("0 * * * *", function () {
  const now = new Date();
  const gmtPlus2 = new Date(now.getTime() + (2 * 60 * 60 * 1000)); // GMT+2
  const timeString = `[${gmtPlus2.getHours().toString().padStart(2, '0')}:${gmtPlus2.getMinutes().toString().padStart(2, '0')} ${gmtPlus2.getDate().toString().padStart(2, '0')}.${(gmtPlus2.getMonth() + 1).toString().padStart(2, '0')}.${gmtPlus2.getFullYear()}]`;
  
  console.log(`[CRON] ${timeString} | Starting subscription status check`);
  checkSubscriptionStatus();
});
