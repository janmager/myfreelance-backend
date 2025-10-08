import express from 'express';
import { 
    getConversations, 
    getConversationMessages, 
    sendFreelancerMessage,
    getUnreadCount 
} from '../controllers/freelancerMessagesController.js';

const router = express.Router();

// Freelancer messaging routes
router.post('/conversations', getConversations);
router.post('/conversation', getConversationMessages);
router.post('/send', sendFreelancerMessage);
router.post('/unread-count', getUnreadCount);

export default router;

