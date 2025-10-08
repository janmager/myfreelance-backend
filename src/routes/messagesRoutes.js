import express from 'express';
import { sendMessage, getMessages, sendMessageFromFreelancer } from '../controllers/messagesController.js';

const router = express.Router();

// Public routes for client messaging
router.post('/send', sendMessage);
router.post('/get', getMessages);

// Freelancer routes (for future use in panel)
router.post('/send-from-freelancer', sendMessageFromFreelancer);

export default router;

