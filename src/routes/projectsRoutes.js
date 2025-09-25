import express from 'express';
import { addProject, editProject, listProjects, getProject, deleteProject } from '../controllers/projectsController.js';

const router = express.Router();

// Mounted under /api/projects
router.post('/add', addProject);
router.put('/edit', editProject);
router.post('/list', listProjects);
router.post('/get', getProject);
router.delete('/delete', deleteProject);

export default router;


