import { getOrCreatePriceId } from '../config/stripe.js';

// Initialize Stripe products and prices
export async function initializeStripeProducts() {
  try {
    console.log('🔄 Initializing Stripe products...');
    
    // Initialize Premium plan
    const premiumPriceId = await getOrCreatePriceId('premium');
    console.log('✅ Premium plan initialized:', premiumPriceId);
    
    // Initialize Gold plan
    const goldPriceId = await getOrCreatePriceId('gold');
    console.log('✅ Gold plan initialized:', goldPriceId);
    
    console.log('✅ All Stripe products initialized successfully');
    console.log('📝 Note: Update your .env file with these Price IDs if needed:');
    console.log(`   STRIPE_PREMIUM_PRICE_ID=${premiumPriceId}`);
    console.log(`   STRIPE_GOLD_PRICE_ID=${goldPriceId}`);
    
    return {
      premiumPriceId,
      goldPriceId
    };
    
  } catch (error) {
    console.error('❌ Error initializing Stripe products:', error);
    throw error;
  }
}
