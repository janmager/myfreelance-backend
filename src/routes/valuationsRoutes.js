import express from 'express';
import {
  getValuations,
  getValuation,
  createValuation,
  updateValuation,
  deleteValuation,
  getValuationStats
} from '../controllers/valuationsController.js';

const router = express.Router();

// Get all valuations for a user
router.post('/list', getValuations);

// Get single valuation
router.post('/get', getValuation);

// Create new valuation
router.post('/create', createValuation);

// Update valuation
router.put('/update', updateValuation);

// Delete valuation
router.delete('/delete', deleteValuation);

// Get valuation statistics
router.post('/stats', getValuationStats);

export default router;
