import express from 'express';
import { 
  createCheckoutSession, 
  getUserPayments, 
  getPaymentStatus, 
  cancelSubscription 
} from '../controllers/paymentsController.js';
import { stripeWebhook } from '../controllers/webhookController.js';

const router = express.Router();

// Webhook endpoint (must be before body parser middleware)
router.post('/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

// Payment endpoints
router.post('/create-checkout-session', createCheckoutSession);
router.post('/user-payments', getUserPayments);
router.get('/payment-status', getPaymentStatus);
router.post('/cancel-subscription', cancelSubscription);

export default router;
