import express from 'express';
import { addNote, editNote, deleteNote, listNotes, getNote } from '../controllers/notesController.js';

const router = express.Router();

// Mounted under /api/notes
router.post('/add', addNote);
router.put('/edit', editNote);
router.delete('/delete', deleteNote);
router.post('/list', listNotes);
router.post('/get', getNote);

export default router;


