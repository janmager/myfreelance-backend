import express from 'express';
import { getLimits, getUserUsage, checkClientLimit, checkProjectLimit, checkNoteLimit, checkContractLimit, checkFileSizeLimit, checkLinkLimit, checkTaskLimit, checkValuationLimit } from '../controllers/limitsController.js';

const router = express.Router();

// GET /api/limits - Get all limits
router.get('/', getLimits);

// POST /api/usage - Get user usage statistics
router.post('/usage', getUserUsage);

// POST /api/limits/check-client - Check if user can add more clients
router.post('/check-client', checkClientLimit);

// POST /api/limits/check-project - Check if user can add more projects
router.post('/check-project', checkProjectLimit);

// POST /api/limits/check-note - Check if user can add more notes
router.post('/check-note', checkNoteLimit);

// POST /api/limits/check-contract - Check if user can add more contracts
router.post('/check-contract', checkContractLimit);

// POST /api/limits/check-file-size - Check if user can upload file based on size limit
router.post('/check-file-size', checkFileSizeLimit);

// POST /api/limits/check-link - Check if user can add more links
router.post('/check-link', checkLinkLimit);

// POST /api/limits/check-task - Check if user can add more tasks
router.post('/check-task', checkTaskLimit);

// POST /api/limits/check-valuation - Check if user can add more valuations
router.post('/check-valuation', checkValuationLimit);

export default router;
