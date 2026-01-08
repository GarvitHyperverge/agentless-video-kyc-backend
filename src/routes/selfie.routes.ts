import { Router } from 'express';
import { uploadSelfie } from '../controllers/selfie.controller';
import { validateSessionMiddleware } from '../middleware/validateSession.middleware';

const router = Router();

router.post('/upload', validateSessionMiddleware, uploadSelfie);

export default router;
