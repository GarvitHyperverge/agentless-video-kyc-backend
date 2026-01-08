import { Router } from 'express';
import { createSessionMetadata } from '../controllers/sessionMetadata.controller';
import { validateSessionMiddleware } from '../middleware/validateSession.middleware';

const router = Router();

// Create a new session metadata
router.post('/', validateSessionMiddleware, createSessionMetadata);

export default router;
