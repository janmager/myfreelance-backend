import express from 'express';
import { addLink, editLink, deleteLink, getLinks } from '../controllers/linksController.js';

const router = express.Router();

// Add link
router.post('/add', addLink);

// Edit link
router.put('/edit', editLink);

// Delete link
router.delete('/delete', deleteLink);

// Get links list
router.post('/list', getLinks);

export default router;
