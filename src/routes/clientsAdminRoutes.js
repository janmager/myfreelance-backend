import express from 'express';
import {
  getAllClientsAdmin,
  editClientAdmin,
} from '../controllers/clientsController.js';

const router = express.Router();

// All routes here are mounted under /api/admin/clients
router.post('/', getAllClientsAdmin); // supports POST /api/admin/clients
router.post('/all', getAllClientsAdmin); // legacy alias
router.put('/edit', editClientAdmin);

export default router;




