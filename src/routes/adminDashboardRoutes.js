import express from 'express';
import { getDashboardStats } from '../controllers/adminDashboardController.js';

const router = express.Router();

// POST /api/admin/dashboard - Get dashboard statistics (admin only)
router.post('/', getDashboardStats);

export default router;
