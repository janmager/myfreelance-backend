import express from 'express';
import { addNote, editNote, deleteNote, listNotes } from '../controllers/notesController.js';

const router = express.Router();

// Mounted under /api/notes
router.post('/add', addNote);
router.put('/edit', editNote);
router.delete('/delete', deleteNote);
router.post('/list', listNotes);

export default router;


