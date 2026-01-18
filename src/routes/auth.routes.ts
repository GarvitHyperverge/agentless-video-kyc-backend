import { Router } from 'express';
import { checkAuth } from '../controllers/auth.controller';
import { jwtAuthMiddleware } from '../middleware/jwtAuth.middleware';

const router = Router();

// Check authentication status (requires JWT)
// Frontend calls this on page load to check if user is authenticated
router.get('/check', jwtAuthMiddleware, checkAuth);

export default router;
