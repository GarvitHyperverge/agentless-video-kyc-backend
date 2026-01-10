import { Router } from 'express';
import { login } from '../controllers/auditSession.controller';
import { getPendingSessions, getSessionDetailsController } from '../controllers/audit.controller';

const router = Router();

// Login route (no middleware required)
router.post('/login', login);

// Get all pending sessions with optional filter
router.get('/pending-sessions', getPendingSessions);

// Get complete session details by session_uid
router.get('/sessions/:sessionUid', getSessionDetailsController);

export default router;
