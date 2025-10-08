import express from 'express';
import { subscribeToNewsletter, unsubscribeFromNewsletter } from '../controllers/newsletterController.js';

const router = express.Router();

// Newsletter routes
router.post('/subscribe', subscribeToNewsletter);
router.post('/unsubscribe', unsubscribeFromNewsletter);

export default router;

