import express from 'express';
import {
  getUserSubscription,
  getUserPremiumStatus
} from '../controllers/subscriptionController.js';

const router = express.Router();

// Get user's current subscription
router.post('/get-subscription', getUserSubscription);

// Get user's premium status and subscription info
router.post('/premium-status', getUserPremiumStatus);

export default router;
