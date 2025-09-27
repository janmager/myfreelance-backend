// Force create new Stripe products - ignores existing Price IDs
import { stripe } from './src/config/stripe.js';
import dotenv from 'dotenv';

dotenv.config();

async function forceCreateProducts() {
  try {
    console.log('🔄 Force creating new Stripe products...');
    
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('❌ STRIPE_SECRET_KEY not found in environment variables');
      process.exit(1);
    }
    
    // Create Premium plan
    console.log('🔄 Creating Premium plan...');
    const premiumProduct = await stripe.products.create({
      name: 'Premium Plan',
      description: 'Premium subscription for freelancers',
    });
    
    const premiumPrice = await stripe.prices.create({
      unit_amount: 2900, // 29 PLN in cents
      currency: 'pln',
      recurring: {
        interval: 'month',
      },
      product: premiumProduct.id,
    });
    
    console.log('✅ Premium plan created:');
    console.log(`   Product ID: ${premiumProduct.id}`);
    console.log(`   Price ID: ${premiumPrice.id}`);
    
    // Create Gold plan
    console.log('🔄 Creating Gold plan...');
    const goldProduct = await stripe.products.create({
      name: 'Gold Plan',
      description: 'Gold subscription for freelancers',
    });
    
    const goldPrice = await stripe.prices.create({
      unit_amount: 4900, // 49 PLN in cents
      currency: 'pln',
      recurring: {
        interval: 'month',
      },
      product: goldProduct.id,
    });
    
    console.log('✅ Gold plan created:');
    console.log(`   Product ID: ${goldProduct.id}`);
    console.log(`   Price ID: ${goldPrice.id}`);
    
    console.log('\n📝 Add these to your .env file:');
    console.log(`STRIPE_PREMIUM_PRICE_ID=${premiumPrice.id}`);
    console.log(`STRIPE_GOLD_PRICE_ID=${goldPrice.id}`);
    
    console.log('\n🎉 All products created successfully!');
    
  } catch (error) {
    console.error('❌ Error creating products:', error);
    process.exit(1);
  }
}

forceCreateProducts();
