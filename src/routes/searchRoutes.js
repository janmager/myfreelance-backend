import express from 'express';
import { globalSearch } from '../controllers/searchController.js';

const router = express.Router();

// Mounted under /api/search
router.post('/global', globalSearch);

export default router;


