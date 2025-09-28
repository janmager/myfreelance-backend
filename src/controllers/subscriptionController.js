import { sql } from '../config/db.js';
import { stripe, getProductConfig } from '../config/stripe.js';

// Get user's subscription status
export async function getUserSubscription(req, res) {
  try {
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({
        response: false,
        message: 'user_id jest wymagane'
      });
    }

    // Get user's current subscription
    const subscription = await sql`
      SELECT 
        s.*,
        u.premium_level,
        u.email,
        u.name
      FROM user_subscriptions s
      JOIN users u ON s.user_id = u.user_id
      WHERE s.user_id = ${user_id}
      AND s.status = 'active'
      ORDER BY s.created_at DESC
      LIMIT 1
    `;

    if (subscription.length === 0) {
      return res.status(404).json({
        response: false,
        message: 'Brak aktywnej subskrypcji'
      });
    }

    const sub = subscription[0];
    
    // Get subscription details from Stripe
    try {
      const stripeSubscription = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);

      res.status(200).json({
        response: true,
        subscription: {
          id: sub.subscription_id,
          product_name: sub.product_name,
          status: sub.status,
          premium_level: sub.premium_level,
          created_at: sub.created_at,
          expires_at: sub.expires_at,
          stripe_subscription_id: sub.stripe_subscription_id,
          stripe_data: stripeSubscription || null,
        }
      });
    } catch (stripeError) {
      console.error('Error fetching Stripe subscription:', stripeError);
      res.status(200).json({
        response: true,
        subscription: {
          id: sub.subscription_id,
          product_name: sub.product_name,
          status: sub.status,
          premium_level: sub.premium_level,
          created_at: sub.created_at,
          expires_at: sub.expires_at,
          stripe_subscription_id: sub.stripe_subscription_id,
          stripe_data: null,
        }
      });
    }

  } catch (error) {
    console.error('Error getting user subscription:', error);
    res.status(500).json({
      response: false,
      message: 'Błąd podczas pobierania subskrypcji'
    });
  }
}


// Get user's premium status
export async function getUserPremiumStatus(req, res) {
  try {
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({
        response: false,
        message: 'user_id jest wymagane'
      });
    }

    // Get user's current premium level
    const userData = await sql`
      SELECT premium_level, email, name FROM users WHERE user_id = ${user_id}
    `;

    if (userData.length === 0) {
      return res.status(404).json({
        response: false,
        message: 'Użytkownik nie został znaleziony'
      });
    }

    const user = userData[0];
    
    // Get latest subscription if exists
    const subscriptionData = await sql`
      SELECT 
        subscription_id,
        product_name,
        status,
        expires_at,
        stripe_subscription_id
      FROM user_subscriptions 
      WHERE user_id = ${user_id}
      AND status IN ('active', 'cancelled')
      ORDER BY created_at DESC
      LIMIT 1
    `;

    let subscription = null;
    if (subscriptionData.length > 0) {
      const sub = subscriptionData[0];
      
      try {
        // Get subscription details from Stripe if active
        if (sub.status === 'active' && sub.stripe_subscription_id) {
          const stripeSubscription = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);
          
          subscription = {
            id: sub.subscription_id,
            status: sub.status,
            product_name: sub.product_name,
            expires_at: sub.expires_at,
            stripe_data: stripeSubscription || null
          };
        } else {
          subscription = {
            id: sub.subscription_id,
            status: sub.status,
            product_name: sub.product_name,
            expires_at: sub.expires_at,
            stripe_data: null
          };
        }
      } catch (stripeError) {
        console.error('Error fetching subscription from Stripe:', stripeError);
        subscription = {
          id: sub.subscription_id,
          status: sub.status,
          product_name: sub.product_name,
          expires_at: sub.expires_at,
          stripe_data: null
        };
      }
    }

    res.status(200).json({
      response: true,
      user: {
        premium_level: user.premium_level,
        email: user.email,
        name: user.name
      },
      subscription: subscription
    });

  } catch (error) {
    console.error('Error getting user premium status:', error);
    res.status(500).json({
      response: false,
      message: 'Błąd podczas pobierania statusu premium użytkownika'
    });
  }
}

// Cancel subscription (cancel at period end)
export async function cancelSubscription(req, res) {
  try {
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({
        response: false,
        message: 'user_id jest wymagane'
      });
    }

    // Get user's active subscription
    const subscription = await sql`
      SELECT * FROM user_subscriptions 
      WHERE user_id = ${user_id} 
      AND status = 'active'
      AND stripe_subscription_id IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 1
    `;

    if (subscription.length === 0) {
      return res.status(404).json({
        response: false,
        message: 'Nie znaleziono aktywnej subskrypcji'
      });
    }

    const sub = subscription[0];

    // Cancel subscription in Stripe (cancel at period end)
    try {
      await stripe.subscriptions.update(sub.stripe_subscription_id, {
        cancel_at_period_end: true,
      });

      // Update local status
      await sql`
        UPDATE user_subscriptions 
        SET 
          status = 'cancelled_at_period_end',
          updated_at = CURRENT_TIMESTAMP
        WHERE subscription_id = ${sub.subscription_id}
      `;

      res.status(200).json({
        response: true,
        message: 'Subskrypcja została zaplanowana do anulowania na koniec bieżącego okresu rozliczeniowego'
      });

    } catch (stripeError) {
      console.error('Error canceling Stripe subscription:', stripeError);
      res.status(500).json({
        response: false,
        message: 'Błąd podczas anulowania subskrypcji w Stripe'
      });
    }

  } catch (error) {
    console.error('Error canceling subscription:', error);
    res.status(500).json({
      response: false,
      message: 'Błąd podczas anulowania subskrypcji'
    });
  }
}

// Resume subscription (cancel the cancellation)
export async function resumeSubscription(req, res) {
  try {
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({
        response: false,
        message: 'user_id jest wymagane'
      });
    }

    // Get user's active subscription (regardless of local status)
    const subscription = await sql`
      SELECT * FROM user_subscriptions 
      WHERE user_id = ${user_id} 
      AND status = 'active'
      AND stripe_subscription_id IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 1
    `;

    if (subscription.length === 0) {
      return res.status(404).json({
        response: false,
        message: 'Nie znaleziono aktywnej subskrypcji'
      });
    }

    const sub = subscription[0];

    // Check if subscription is actually scheduled for cancellation in Stripe
    try {
      const stripeSubscription = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);
      
      if (!stripeSubscription.cancel_at_period_end) {
        return res.status(400).json({
          response: false,
          message: 'Subskrypcja nie jest zaplanowana do anulowania'
        });
      }

      // Resume subscription in Stripe
      await stripe.subscriptions.update(sub.stripe_subscription_id, {
        cancel_at_period_end: false,
      });

      // Update local status to ensure it's active
      await sql`
        UPDATE user_subscriptions 
        SET 
          status = 'active',
          updated_at = CURRENT_TIMESTAMP
        WHERE subscription_id = ${sub.subscription_id}
      `;

      res.status(200).json({
        response: true,
        message: 'Subskrypcja została wznowiona pomyślnie'
      });

    } catch (stripeError) {
      console.error('Error resuming Stripe subscription:', stripeError);
      res.status(500).json({
        response: false,
        message: 'Błąd podczas wznawiania subskrypcji w Stripe'
      });
    }

  } catch (error) {
    console.error('Error resuming subscription:', error);
    res.status(500).json({
      response: false,
      message: 'Błąd podczas wznawiania subskrypcji'
    });
  }
}

// Get subscription management info
export async function getSubscriptionManagementInfo(req, res) {
  try {
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({
        response: false,
        message: 'user_id jest wymagane'
      });
    }

    // Get user's subscription
    const subscription = await sql`
      SELECT * FROM user_subscriptions 
      WHERE user_id = ${user_id} 
      AND stripe_subscription_id IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 1
    `;

    if (subscription.length === 0) {
      return res.status(404).json({
        response: false,
        message: 'Brak subskrypcji'
      });
    }

    const sub = subscription[0];

    // Get detailed subscription info from Stripe
    try {
      const stripeSubscription = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);
      
      // Use Stripe data for dates if local data is null
      const expiresAt = sub.expires_at || new Date(stripeSubscription.current_period_end * 1000).toISOString();
      const currentPeriodStart = sub.current_period_start || new Date(stripeSubscription.current_period_start * 1000).toISOString();
      const currentPeriodEnd = sub.current_period_end || new Date(stripeSubscription.current_period_end * 1000).toISOString();
      
      res.status(200).json({
        response: true,
        subscription: {
          id: sub.subscription_id,
          product_name: sub.product_name,
          status: sub.status,
          created_at: sub.created_at,
          expires_at: expiresAt,
          current_period_start: currentPeriodStart,
          current_period_end: currentPeriodEnd,
          stripe_subscription_id: sub.stripe_subscription_id,
          stripe_data: stripeSubscription // Return full Stripe subscription object like in cron.js
        }
      });

    } catch (stripeError) {
      console.error('Error fetching Stripe subscription:', stripeError);
      res.status(200).json({
        response: true,
        subscription: {
          id: sub.subscription_id,
          product_name: sub.product_name,
          status: sub.status,
          created_at: sub.created_at,
          expires_at: sub.expires_at,
          current_period_start: sub.current_period_start,
          current_period_end: sub.current_period_end,
          stripe_subscription_id: sub.stripe_subscription_id,
          stripe_data: null
        }
      });
    }

  } catch (error) {
    console.error('Error getting subscription management info:', error);
    res.status(500).json({
      response: false,
      message: 'Błąd podczas pobierania informacji o subskrypcji'
    });
  }
}
