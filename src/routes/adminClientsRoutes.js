import express from 'express';
import { getClients, updateClient, getClient } from '../controllers/adminClientsController.js';

const router = express.Router();

// GET endpoints
router.get('/:client_id', getClient);

// POST endpoints
router.post('/', getClients);
router.post('/:client_id', getClient);

// PUT endpoints
router.put('/:client_id', updateClient);

export default router;
