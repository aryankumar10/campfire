import express from 'express';
import { searchUsers } from '../controllers/usersController.js';
import auth from '../middleware/auth.js';

const router = express.Router();

router.get('/', auth, searchUsers);

export default router;
