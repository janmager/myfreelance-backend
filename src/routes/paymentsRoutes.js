import express from 'express';
import { 
  createCheckoutSession, 
  getUserPayments, 
  getPaymentStatus, 
  cancelSubscription 
} from '../controllers/paymentsController.js';

const router = express.Router();

// Payment endpoints
router.post('/create-checkout-session', createCheckoutSession);
router.post('/user-payments', getUserPayments);
router.get('/payment-status', getPaymentStatus);
router.post('/cancel-subscription', cancelSubscription);

export default router;
