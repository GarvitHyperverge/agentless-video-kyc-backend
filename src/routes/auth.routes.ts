import { Router } from 'express';
import { checkAuth, checkAuditAuth } from '../controllers/auth.controller';
import { jwtAuthMiddleware } from '../middleware/jwtAuth.middleware';
import { auditJwtAuthMiddleware } from '../middleware/auditJwtAuth.middleware';

const router = Router();

// Check authentication status for verification sessions (requires JWT)
// Frontend calls this on page load to check if user is authenticated
router.get('/check', jwtAuthMiddleware, checkAuth);

// Check authentication status for audit sessions (requires audit JWT)
// Audit frontend calls this on page load to check if user is authenticated
router.get('/audit/check', auditJwtAuthMiddleware, checkAuditAuth);

export default router;
