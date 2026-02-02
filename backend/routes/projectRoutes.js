import express from 'express';
import { createProject, getProjects, getProjectById, createRoomInProject, updateProject, deleteProject, addMember, removeMember, addRoomAllowedMember, removeRoomAllowedMember } from '../controllers/ProjectController.js';
import auth from '../middleware/auth.js';

const router = express.Router();

router.post('/', auth, createProject);
router.get('/', auth, getProjects);
router.get('/:id', auth, getProjectById);
router.post('/:projectId/rooms', auth, createRoomInProject);
router.put('/:id', auth, updateProject);
router.delete('/:id', auth, deleteProject);
router.post('/:id/members', auth, addMember);
router.delete('/:id/members/:memberId', auth, removeMember);
router.post('/:projectId/rooms/:roomId/allowed', auth, addRoomAllowedMember);
router.delete('/:projectId/rooms/:roomId/allowed/:userId', auth, removeRoomAllowedMember);

export default router;
