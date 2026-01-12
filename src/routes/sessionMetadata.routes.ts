import { Router } from 'express';
import { createSessionMetadata } from '../controllers/sessionMetadata.controller';
import { jwtAuthMiddleware } from '../middleware/jwtAuth.middleware';

const router = Router();

// Create a new session metadata
router.post('/', jwtAuthMiddleware, createSessionMetadata);

export default router;
