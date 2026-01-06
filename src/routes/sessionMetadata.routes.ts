import { Router } from 'express';
import { createSessionMetadata } from '../controllers/sessionMetadata.controller';

const router = Router();

// Create a new session metadata
router.post('/', createSessionMetadata);

export default router;
