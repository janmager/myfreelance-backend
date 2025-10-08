import express from 'express';
import { 
    getClientBySlug, 
    verifyClientPassword, 
    getClientProjects, 
    getProjectValuations,
    getClientValuations,
    getProjectLinks
} from '../controllers/publicClientController.js';

const router = express.Router();

// Public routes for client portal
router.post('/check-slug', getClientBySlug);
router.post('/verify-password', verifyClientPassword);
router.post('/get-projects', getClientProjects);
router.post('/get-valuations', getProjectValuations);
router.post('/get-client-valuations', getClientValuations);
router.post('/get-project-links', getProjectLinks);

export default router;

