import express from 'express';
import {
  getUserSubscription,
  getUserPremiumStatus,
  cancelSubscription,
  resumeSubscription,
  getSubscriptionManagementInfo
} from '../controllers/subscriptionController.js';

const router = express.Router();

// Get user's current subscription
router.post('/get-subscription', getUserSubscription);

// Get user's premium status and subscription info
router.post('/premium-status', getUserPremiumStatus);

// Get detailed subscription management info
router.post('/management-info', getSubscriptionManagementInfo);

// Cancel subscription (cancel at period end)
router.post('/cancel', cancelSubscription);

// Resume subscription (cancel the cancellation)
router.post('/resume', resumeSubscription);

export default router;
