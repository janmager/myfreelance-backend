import { sql } from '../config/db.js';
import { stripe, STRIPE_CONFIG, getProductConfig } from '../config/stripe.js';

// Create checkout session for subscription
export async function createSubscriptionCheckout(req, res) {
  try {
    const { user_id, product_name } = req.body;

    if (!user_id || !product_name) {
      return res.status(400).json({
        response: false,
        message: 'user_id i product_name są wymagane'
      });
    }

    // Validate product name
    const productConfig = getProductConfig(product_name);
    
    // Get user data
    const user = await sql`
      SELECT * FROM users WHERE user_id = ${user_id}
    `;

    if (user.length === 0) {
      return res.status(404).json({
        response: false,
        message: 'Użytkownik nie został znaleziony'
      });
    }

    const userData = user[0];

    // Check if user already has an active subscription for this product
    const existingActiveSubscription = await sql`
      SELECT * FROM user_subscriptions 
      WHERE user_id = ${user_id} 
      AND product_name = ${product_name}
      AND status = 'active'
    `;

    if (existingActiveSubscription.length > 0) {
      return res.status(400).json({
        response: false,
        message: `Masz już aktywną subskrypcję ${product_name}. Przejdź do panelu subskrypcji, aby zarządzać swoim planem.`
      });
    }

    // Create Stripe checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: productConfig.priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      customer_email: userData.email,
      metadata: {
        user_id: user_id,
        product_name: product_name,
      },
      success_url: STRIPE_CONFIG.SUCCESS_URL,
      cancel_url: STRIPE_CONFIG.CANCEL_URL,
      subscription_data: {
        metadata: {
          user_id: user_id,
          product_name: product_name,
        },
      },
    });

    if (!checkoutSession || !checkoutSession.id) {
      throw new Error('Failed to create checkout session');
    }

    // Save or update pending subscription record
    await sql`
      INSERT INTO user_subscriptions (
        user_id,
        product_name,
        stripe_price_id,
        stripe_checkout_session_id,
        status,
        created_at
      ) VALUES (
        ${user_id},
        ${product_name},
        ${productConfig.priceId},
        ${checkoutSession.id},
        'pending',
        CURRENT_TIMESTAMP
      )
      ON CONFLICT (user_id, product_name) 
      DO UPDATE SET
        stripe_price_id = EXCLUDED.stripe_price_id,
        stripe_checkout_session_id = EXCLUDED.stripe_checkout_session_id,
        status = EXCLUDED.status,
        updated_at = CURRENT_TIMESTAMP
    `;

    res.status(200).json({
      response: true,
      checkout_url: checkoutSession.url,
      checkout_id: checkoutSession.id,
    });

  } catch (error) {
    console.error('Error creating subscription checkout:', error);
    res.status(500).json({
      response: false,
      message: 'Błąd podczas tworzenia sesji płatności'
    });
  }
}

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

// Cancel subscription
export async function cancelSubscription(req, res) {
  try {
    const { user_id, subscription_id } = req.body;

    if (!user_id || !subscription_id) {
      return res.status(400).json({
        response: false,
        message: 'user_id i subscription_id są wymagane'
      });
    }

    // Get subscription details
    const subscription = await sql`
      SELECT * FROM user_subscriptions 
      WHERE user_id = ${user_id} 
      AND subscription_id = ${subscription_id}
      AND status = 'active'
    `;

    if (subscription.length === 0) {
      return res.status(404).json({
        response: false,
        message: 'Subskrypcja nie została znaleziona'
      });
    }

    const sub = subscription[0];

    // Cancel subscription in Stripe
    try {
      await stripe.subscriptions.update(sub.stripe_subscription_id, {
        cancel_at_period_end: true,
      });
    } catch (stripeError) {
      console.error('Error canceling Stripe subscription:', stripeError);
      // Continue with local cancellation even if Stripe fails
    }

    // Update subscription status in database
    await sql`
      UPDATE user_subscriptions 
      SET 
        status = 'cancelled',
        cancelled_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ${user_id} 
      AND subscription_id = ${subscription_id}
    `;

    // Update user premium level to 0 (free)
    await sql`
      UPDATE users 
      SET 
        premium_level = 0,
        updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ${user_id}
    `;

    res.status(200).json({
      response: true,
      message: 'Subskrypcja została anulowana'
    });

  } catch (error) {
    console.error('Error canceling subscription:', error);
    res.status(500).json({
      response: false,
      message: 'Błąd podczas anulowania subskrypcji'
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
