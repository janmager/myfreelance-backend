import { sql } from '../config/db.js';
import { stripe, STRIPE_CONFIG, getProductConfig } from '../config/stripe.js';

// Create Stripe checkout session
export async function createCheckoutSession(req, res) {
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

    // Create or get Stripe customer
    let customer;
    try {
      const existingCustomers = await stripe.customers.list({
        email: userData.email,
        limit: 1,
      });

      if (existingCustomers.data.length > 0) {
        customer = existingCustomers.data[0];
      } else {
        customer = await stripe.customers.create({
          email: userData.email,
          name: userData.name,
          metadata: {
            user_id: user_id,
          },
        });
      }
    } catch (stripeError) {
      console.error('Stripe customer error:', stripeError);
      return res.status(500).json({
        response: false,
        message: 'Błąd podczas tworzenia klienta Stripe'
      });
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: [
        {
          price: productConfig.stripePriceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${STRIPE_CONFIG.SUCCESS_URL}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: STRIPE_CONFIG.CANCEL_URL,
      metadata: {
        user_id: user_id,
        product_name: product_name,
      },
      subscription_data: {
        metadata: {
          user_id: user_id,
          product_name: product_name,
        },
      },
    });

    // Save pending payment record
    await sql`
      INSERT INTO user_payments (
        user_id, 
        stripe_customer_id, 
        product_name, 
        amount, 
        currency, 
        status, 
        created_at
      ) VALUES (
        ${user_id},
        ${customer.id},
        ${product_name},
        ${productConfig.price},
        ${productConfig.currency},
        'pending',
        CURRENT_TIMESTAMP
      )
    `;

    res.status(200).json({
      response: true,
      session_url: session.url,
      session_id: session.id,
    });

  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({
      response: false,
      message: 'Błąd podczas tworzenia sesji płatności'
    });
  }
}

// Get user payments
export async function getUserPayments(req, res) {
  try {
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({
        response: false,
        message: 'user_id jest wymagane'
      });
    }

    const payments = await sql`
      SELECT 
        payment_id,
        stripe_payment_intent_id,
        stripe_subscription_id,
        product_name,
        amount,
        currency,
        status,
        payment_method,
        created_at,
        paid_at,
        subscription_start_date,
        subscription_end_date,
        metadata
      FROM user_payments 
      WHERE user_id = ${user_id}
      ORDER BY created_at DESC
    `;

    res.status(200).json({
      response: true,
      payments: payments,
    });

  } catch (error) {
    console.error('Error getting user payments:', error);
    res.status(500).json({
      response: false,
      message: 'Błąd podczas pobierania płatności'
    });
  }
}

// Get payment status
export async function getPaymentStatus(req, res) {
  try {
    const { session_id } = req.query;

    if (!session_id) {
      return res.status(400).json({
        response: false,
        message: 'session_id jest wymagane'
      });
    }

    // Get session from Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id);

    // Get payment from database
    const payment = await sql`
      SELECT * FROM user_payments 
      WHERE stripe_payment_intent_id = ${session.payment_intent} 
      OR stripe_subscription_id = ${session.subscription}
      ORDER BY created_at DESC 
      LIMIT 1
    `;

    if (payment.length === 0) {
      return res.status(404).json({
        response: false,
        message: 'Płatność nie została znaleziona'
      });
    }

    res.status(200).json({
      response: true,
      payment: payment[0],
      session_status: session.payment_status,
    });

  } catch (error) {
    console.error('Error getting payment status:', error);
    res.status(500).json({
      response: false,
      message: 'Błąd podczas pobierania statusu płatności'
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

    // Cancel subscription in Stripe
    await stripe.subscriptions.cancel(subscription_id);

    // Update payment status in database
    await sql`
      UPDATE user_payments 
      SET status = 'canceled', updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ${user_id} AND stripe_subscription_id = ${subscription_id}
    `;

    // Update user premium level to 0 (free)
    await sql`
      UPDATE users 
      SET premium_level = 0, updated_at = CURRENT_TIMESTAMP
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
