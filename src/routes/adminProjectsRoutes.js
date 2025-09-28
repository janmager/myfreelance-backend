import express from 'express';
import { getProjects, updateProject, getProject } from '../controllers/adminProjectsController.js';

const router = express.Router();

router.post('/', getProjects); // For paginated list with search/sort
router.put('/:project_id', updateProject);
router.post('/:project_id', getProject); // For fetching a single project

export default router;
