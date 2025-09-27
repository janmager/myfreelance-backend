import express from 'express';
import {
  createSubscriptionCheckout,
  getUserSubscription,
  cancelSubscription,
  getUserPremiumStatus
} from '../controllers/subscriptionController.js';

const router = express.Router();

// Create checkout session for subscription
router.post('/checkout', createSubscriptionCheckout);

// Get user's current subscription
router.post('/get-subscription', getUserSubscription);

// Cancel user's subscription
router.post('/cancel', cancelSubscription);

// Get user's premium status and subscription info
router.post('/premium-status', getUserPremiumStatus);

export default router;
