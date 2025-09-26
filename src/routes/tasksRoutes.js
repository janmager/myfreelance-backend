import express from 'express';
import { addTask, editTask, deleteTask, listTasks, getUpcomingTasks } from '../controllers/tasksController.js';

const router = express.Router();

// Mounted under /api/tasks
router.post('/add', addTask);
router.put('/edit', editTask);
router.delete('/delete', deleteTask);
router.post('/list', listTasks);
router.post('/upcoming', getUpcomingTasks);

export default router;


