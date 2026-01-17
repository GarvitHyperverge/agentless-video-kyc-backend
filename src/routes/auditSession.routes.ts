import { Router } from 'express';
import { login, logout } from '../controllers/auditSession.controller';
import { getPendingSessions, getSessionDetailsController } from '../controllers/audit.controller';
import { auditJwtAuthMiddleware } from '../middleware/auditJwtAuth.middleware';

const router = Router();

// Login route 
router.post('/login', login);

// Logout route - clears the server-side cookie
router.post('/logout', logout);

// Protected routes 
// Get all pending sessions with optional filter
router.get('/pending-sessions', auditJwtAuthMiddleware, getPendingSessions);

// Get complete session details by session_uid
router.get('/sessions/:sessionUid', auditJwtAuthMiddleware, getSessionDetailsController);

export default router;
