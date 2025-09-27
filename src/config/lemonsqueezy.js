import { lemonSqueezySetup, createCheckout, getSubscription } from '@lemonsqueezy/lemonsqueezy.js';

// Initialize Lemon Squeezy
export const lemonSqueezy = lemonSqueezySetup({
  apiKey: process.env.LEMONSQUEEZY_API_KEY,
  onError: (error) => console.error('Lemon Squeezy Error:', error),
});

// Export individual functions for easier use
export { createCheckout, getSubscription };

// Configuration
export const LEMONSQUEEZY_CONFIG = {
  // Store ID from Lemon Squeezy dashboard
  STORE_ID: process.env.LEMONSQUEEZY_STORE_ID,
  
  // Product variants for different subscription tiers
  PRODUCT_VARIANTS: {
    premium: process.env.LEMONSQUEEZY_PREMIUM_VARIANT_ID, // Monthly premium subscription
    gold: process.env.LEMONSQUEEZY_GOLD_VARIANT_ID, // Monthly gold subscription
  },
  
  // Webhook secret for verifying webhook requests
  WEBHOOK_SECRET: process.env.LEMONSQUEEZY_WEBHOOK_SECRET,
  
  // URLs for checkout success and cancel
  SUCCESS_URL: process.env.NEXT_PUBLIC_APP_URL + '/panel/profile/subscription?status=success',
  CANCEL_URL: process.env.NEXT_PUBLIC_APP_URL + '/panel/premium',
  
  // Checkout settings
  CHECKOUT_SETTINGS: {
    theme: 'light',
    logo: process.env.NEXT_PUBLIC_APP_URL + '/assets/brand/logo.png',
    desc: 'Unlock premium features and increase your limits',
    discount: true,
    dark: false,
    subscription_preview: true,
    button_color: '#3B82F6',
  }
};

// Product configuration for different subscription tiers
export const getProductConfig = (productName) => {
  switch (productName) {
    case 'premium':
      return {
        name: 'Premium Plan',
        description: 'Unlock premium features with increased limits',
        price: 29.00,
        currency: 'PLN',
        variantId: LEMONSQUEEZY_CONFIG.PRODUCT_VARIANTS.premium,
        premiumLevel: 1,
        limits: {
          clients: 100,
          projects: 200,
          notes: 1000,
          contracts: 100,
          files_mb: 10000,
          links: 200,
          tasks: 500,
        }
      };
    case 'gold':
      return {
        name: 'Gold Plan',
        description: 'Maximum limits and exclusive features',
        price: 49.00,
        currency: 'PLN',
        variantId: LEMONSQUEEZY_CONFIG.PRODUCT_VARIANTS.gold,
        premiumLevel: 2,
        limits: {
          clients: 500,
          projects: 1000,
          notes: 5000,
          contracts: 500,
          files_mb: 50000,
          links: 1000,
          tasks: 2500,
        }
      };
    default:
      throw new Error(`Unknown product: ${productName}`);
  }
};

export default lemonSqueezy;
