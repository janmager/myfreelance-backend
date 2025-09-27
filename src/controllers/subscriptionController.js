import { sql } from '../config/db.js';
import { lemonSqueezy, createCheckout, getSubscription, LEMONSQUEEZY_CONFIG, getProductConfig } from '../config/lemonsqueezy.js';

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

    // Create checkout session using new API
    const checkoutSession = await createCheckout(
      LEMONSQUEEZY_CONFIG.STORE_ID,
      productConfig.variantId,
      {
        checkoutData: {
          email: userData.email,
          name: userData.name,
          custom: {
            user_id: user_id,
            product_name: product_name,
          },
        },
        expiresAt: null,
        preview: false,
        testMode: process.env.NODE_ENV !== 'production',
      }
    );

    if (!checkoutSession || !checkoutSession.data) {
      throw new Error('Failed to create checkout session');
    }

    // Save or update pending subscription record
    await sql`
      INSERT INTO user_subscriptions (
        user_id,
        product_name,
        lemon_squeezy_variant_id,
        lemon_squeezy_checkout_id,
        status,
        created_at
      ) VALUES (
        ${user_id},
        ${product_name},
        ${productConfig.variantId},
        ${checkoutSession.data?.data?.id || checkoutSession.data?.id || checkoutSession.id},
        'pending',
        CURRENT_TIMESTAMP
      )
      ON CONFLICT (user_id, product_name) 
      DO UPDATE SET
        lemon_squeezy_variant_id = EXCLUDED.lemon_squeezy_variant_id,
        lemon_squeezy_checkout_id = EXCLUDED.lemon_squeezy_checkout_id,
        status = EXCLUDED.status,
        updated_at = CURRENT_TIMESTAMP
    `;

    // Extract URL from response - try different possible structures
    let checkoutUrl = null;
    if (checkoutSession.data && checkoutSession.data.data && checkoutSession.data.data.attributes && checkoutSession.data.data.attributes.url) {
      checkoutUrl = checkoutSession.data.data.attributes.url;
    } else if (checkoutSession.data && checkoutSession.data.attributes && checkoutSession.data.attributes.url) {
      checkoutUrl = checkoutSession.data.attributes.url;
    } else if (checkoutSession.url) {
      checkoutUrl = checkoutSession.url;
    } else if (checkoutSession.checkout_url) {
      checkoutUrl = checkoutSession.checkout_url;
    } else if (checkoutSession.data && checkoutSession.data.url) {
      checkoutUrl = checkoutSession.data.url;
    }

    if (!checkoutUrl) {
      throw new Error('No checkout URL found in response');
    }

    res.status(200).json({
      response: true,
      checkout_url: checkoutUrl,
      checkout_id: checkoutSession.data?.data?.id || checkoutSession.data?.id || checkoutSession.id,
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
    
    // Get subscription details from Lemon Squeezy
    try {
      const lemonSubscription = await getSubscription(sub.lemon_squeezy_subscription_id);

      res.status(200).json({
        response: true,
        subscription: {
          id: sub.subscription_id,
          product_name: sub.product_name,
          status: sub.status,
          premium_level: sub.premium_level,
          created_at: sub.created_at,
          expires_at: sub.expires_at,
          lemon_squeezy_subscription_id: sub.lemon_squeezy_subscription_id,
          lemon_squeezy_data: lemonSubscription.data?.attributes || null,
        }
      });
    } catch (lemonError) {
      console.error('Error fetching Lemon Squeezy subscription:', lemonError);
      res.status(200).json({
        response: true,
        subscription: {
          id: sub.subscription_id,
          product_name: sub.product_name,
          status: sub.status,
          premium_level: sub.premium_level,
          created_at: sub.created_at,
          expires_at: sub.expires_at,
          lemon_squeezy_subscription_id: sub.lemon_squeezy_subscription_id,
          lemon_squeezy_data: null,
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

    // Cancel subscription in Lemon Squeezy
    try {
      await lemonSqueezy.updateSubscription({
        id: sub.lemon_squeezy_subscription_id,
        data: {
          cancelled: true,
          cancelReason: 'Customer requested cancellation'
        }
      });
    } catch (lemonError) {
      console.error('Error canceling Lemon Squeezy subscription:', lemonError);
      // Continue with local cancellation even if Lemon Squeezy fails
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
        lemon_squeezy_subscription_id
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
        // Get subscription details from Lemon Squeezy if active
        if (sub.status === 'active' && sub.lemon_squeezy_subscription_id) {
          const lemonSubscription = await getSubscription(sub.lemon_squeezy_subscription_id);
          
          subscription = {
            id: sub.subscription_id,
            status: sub.status,
            product_name: sub.product_name,
            expires_at: sub.expires_at,
            lemon_squeezy_data: lemonSubscription.data?.attributes || null
          };
        } else {
          subscription = {
            id: sub.subscription_id,
            status: sub.status,
            product_name: sub.product_name,
            expires_at: sub.expires_at,
            lemon_squeezy_data: null
          };
        }
      } catch (lemonError) {
        console.error('Error fetching subscription from Lemon Squeezy:', lemonError);
        subscription = {
          id: sub.subscription_id,
          status: sub.status,
          product_name: sub.product_name,
          expires_at: sub.expires_at,
          lemon_squeezy_data: null
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
