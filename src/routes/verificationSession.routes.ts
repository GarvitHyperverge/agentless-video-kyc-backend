import { Router } from 'express';
import { createVerificationSession, markVerificationSessionCompletedController, updateAuditStatus } from '../controllers/verificationSession.controller';
import { validateSessionMiddleware } from '../middleware/validateSession.middleware';
import { hmacAuthMiddleware } from '../middleware/hmacAuth.middleware';

const router = Router();

// Create a new verification session (requires HMAC authentication)
router.post('/', hmacAuthMiddleware, createVerificationSession);

// Mark verification session as completed
router.patch('/complete', validateSessionMiddleware, markVerificationSessionCompletedController);

// Update verification session audit_status
router.patch('/audit-status', updateAuditStatus);

export default router;
