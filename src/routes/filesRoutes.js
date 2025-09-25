import express from 'express';
import { addFile, listFiles, upload, deleteFile } from '../controllers/filesController.js';

const router = express.Router();

// Mounted under /api/files
router.post('/upload', upload.single('file'), addFile);
router.post('/list', listFiles);
router.delete('/delete', deleteFile);

export default router;


