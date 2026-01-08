import { Router } from 'express';
import { uploadPanCardImages } from '../controllers/panCard.controller';
import { validateSessionMiddleware } from '../middleware/validateSession.middleware';

const router = Router();

router.post('/', validateSessionMiddleware, uploadPanCardImages);

export default router;
