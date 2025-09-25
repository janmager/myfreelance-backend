import express from 'express';
import { addTask, editTask, deleteTask, listTasks } from '../controllers/tasksController.js';

const router = express.Router();

// Mounted under /api/tasks
router.post('/add', addTask);
router.put('/edit', editTask);
router.delete('/delete', deleteTask);
router.post('/list', listTasks);

export default router;


