import express from 'express';
import { createProject, getProjects, getProjectById, createRoomInProject } from '../controllers/ProjectController.js';
import auth from '../middleware/auth.js';

const router = express.Router();

router.post('/', auth, createProject);
router.get('/', auth, getProjects);
router.get('/:id', auth, getProjectById);
router.post('/:projectId/rooms', auth, createRoomInProject);

export default router;
