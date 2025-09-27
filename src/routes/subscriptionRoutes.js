import express from 'express';
import {
  getUserSubscription,
  getUserPremiumStatus
} from '../controllers/subscriptionController.js';
import { stripeWebhook } from '../controllers/stripeWebhookController.js';

const router = express.Router();

// Stripe webhook endpoint (must be before body parser middleware)
router.post('/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

// Get user's current subscription
router.post('/get-subscription', getUserSubscription);

// Get user's premium status and subscription info
router.post('/premium-status', getUserPremiumStatus);

export default router;
