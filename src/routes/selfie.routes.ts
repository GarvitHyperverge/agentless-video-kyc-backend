import { Router } from 'express';
import { uploadSelfie } from '../controllers/selfie.controller';

const router = Router();

router.post('/upload', uploadSelfie);

export default router;
