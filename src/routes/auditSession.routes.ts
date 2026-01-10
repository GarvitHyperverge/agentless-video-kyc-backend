import { Router } from 'express';
import { login } from '../controllers/auditSession.controller';
import { getPendingSessions } from '../controllers/audit.controller';

const router = Router();

// Login route (no middleware required)
router.post('/login', login);

// Get all pending sessions with complete details
router.get('/pending-sessions', getPendingSessions);

export default router;
