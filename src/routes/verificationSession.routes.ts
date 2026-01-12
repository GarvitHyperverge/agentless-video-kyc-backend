import { Router } from 'express';
import { createVerificationSession, markVerificationSessionCompletedController, updateAuditStatus } from '../controllers/verificationSession.controller';
import { jwtAuthMiddleware } from '../middleware/jwtAuth.middleware';
import { hmacAuthMiddleware } from '../middleware/hmacAuth.middleware';

const router = Router();

// Create a new verification session (requires HMAC authentication, no JWT)
router.post('/', hmacAuthMiddleware, createVerificationSession);

// Mark verification session as completed (requires JWT)
router.patch('/complete', jwtAuthMiddleware, markVerificationSessionCompletedController);

// Update verification session audit_status
router.patch('/audit-status', updateAuditStatus);

export default router;
