import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Stripe with secret key
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
});

// Stripe configuration
export const STRIPE_CONFIG = {
  // Product configurations
  PRODUCTS: {
    PREMIUM: {
      name: 'Premium Plan',
      description: 'Premium subscription for freelancers',
      price: 2900, // 29 PLN in cents
      currency: 'pln',
      interval: 'month',
      stripePriceId: process.env.STRIPE_PREMIUM_PRICE_ID,
    },
    GOLD: {
      name: 'Gold Plan',
      description: 'Gold subscription for freelancers',
      price: 4900, // 49 PLN in cents
      currency: 'pln',
      interval: 'month',
      stripePriceId: process.env.STRIPE_GOLD_PRICE_ID,
    }
  },
  
  // Webhook configuration
  WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  
  // Success/Error URLs (with i18n prefix)
  SUCCESS_URL: process.env.STRIPE_SUCCESS_URL || 'http://localhost:3000/pl/panel/profile/payments/status/success',
  CANCEL_URL: process.env.STRIPE_CANCEL_URL || 'http://localhost:3000/pl/panel/profile/payments/status/error',
};

// Helper function to get product config by name
export const getProductConfig = (productName) => {
  const config = STRIPE_CONFIG.PRODUCTS[productName.toUpperCase()];
  if (!config) {
    throw new Error(`Unknown product: ${productName}`);
  }
  return config;
};

// Helper function to get or create price ID
export const getOrCreatePriceId = async (productName) => {
  const config = getProductConfig(productName);
  
  // If price ID is configured, verify it exists
  if (config.stripePriceId) {
    try {
      // Try to retrieve the price to verify it exists
      await stripe.prices.retrieve(config.stripePriceId);
      console.log(`✅ Using existing price ID: ${config.stripePriceId}`);
      return config.stripePriceId;
    } catch (error) {
      console.log(`❌ Price ID ${config.stripePriceId} not found, creating new one...`);
      // Price doesn't exist, continue to create new one
    }
  }
  
  // Create product and price if they don't exist
  try {
    // Create product
    const product = await stripe.products.create({
      name: config.name,
      description: config.description,
    });
    
    // Create price
    const price = await stripe.prices.create({
      unit_amount: config.price,
      currency: config.currency,
      recurring: {
        interval: config.interval,
      },
      product: product.id,
    });
    
    console.log(`✅ Created ${productName} product and price:`, price.id);
    return price.id;
    
  } catch (error) {
    console.error(`❌ Error creating ${productName} product/price:`, error);
    throw error;
  }
};

// Helper function to format amount for display
export const formatAmount = (amountInCents, currency = 'pln') => {
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amountInCents / 100);
};
