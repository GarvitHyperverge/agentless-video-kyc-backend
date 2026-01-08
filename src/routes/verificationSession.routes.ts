import { Router } from 'express';
import { createVerificationSession, markVerificationSessionCompletedController } from '../controllers/verificationSession.controller';
import { validateSessionMiddleware } from '../middleware/validateSession.middleware';

const router = Router();

// Create a new verification session (no middleware - this creates the session)
router.post('/', createVerificationSession);

// Mark verification session as completed
router.patch('/complete', validateSessionMiddleware, markVerificationSessionCompletedController);

export default router;
