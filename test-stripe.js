// Test script for Stripe integration
import { getOrCreatePriceId } from './src/config/stripe.js';
import dotenv from 'dotenv';

dotenv.config();

async function testStripe() {
  try {
    console.log('🧪 Testing Stripe integration...');
    
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('❌ STRIPE_SECRET_KEY not found in environment variables');
      process.exit(1);
    }
    
    console.log('✅ Stripe secret key found');
    
    // Test Premium plan
    console.log('🔄 Testing Premium plan...');
    const premiumPriceId = await getOrCreatePriceId('premium');
    console.log('✅ Premium plan price ID:', premiumPriceId);
    
    // Test Gold plan
    console.log('🔄 Testing Gold plan...');
    const goldPriceId = await getOrCreatePriceId('gold');
    console.log('✅ Gold plan price ID:', goldPriceId);
    
    console.log('🎉 All tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testStripe();
