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
  
  // Success/Error URLs
  SUCCESS_URL: process.env.STRIPE_SUCCESS_URL || 'http://localhost:3000/panel/profile/payments/status/success',
  CANCEL_URL: process.env.STRIPE_CANCEL_URL || 'http://localhost:3000/panel/profile/payments/status/error',
};

// Helper function to get product config by name
export const getProductConfig = (productName) => {
  const config = STRIPE_CONFIG.PRODUCTS[productName.toUpperCase()];
  if (!config) {
    throw new Error(`Unknown product: ${productName}`);
  }
  return config;
};

// Helper function to format amount for display
export const formatAmount = (amountInCents, currency = 'pln') => {
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amountInCents / 100);
};
