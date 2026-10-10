import express from 'express';
import {
  registerUser,
  loginUser,
  getMe,
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Auth routes
router.post('/register', registerUser);
router.post('/signup', registerUser);
router.post('/login', loginUser);
router.get('/me', protect, getMe);

export default router;
