import express from 'express';
import { getAdminLimits, updateAdminLimits, getAdminLimitsStats } from '../controllers/adminLimitsController.js';

const router = express.Router();

// POST /api/admin/limits - Get all limits (admin only)
router.post('/', getAdminLimits);

// PUT /api/admin/limits - Update limits (admin only)
router.put('/', updateAdminLimits);

// POST /api/admin/limits/stats - Get limits statistics (admin only)
router.post('/stats', getAdminLimitsStats);

export default router;
