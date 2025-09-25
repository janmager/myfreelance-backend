import express from 'express';
import {
  getClientById,
  getClientsByUserId,
  archiveClient,
  addClient,
  editClient,
} from '../controllers/clientsController.js';

const router = express.Router();

// All routes here are mounted under /api/clients
router.post('/get', getClientById);
router.post('/list', getClientsByUserId);
router.put('/archive', archiveClient);
router.post('/add', addClient);
router.put('/edit', editClient);

export default router;




