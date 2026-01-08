import { Router } from 'express';
import { uploadOtpVideo } from '../controllers/otpVideo.controller';
import { validateSessionMiddleware } from '../middleware/validateSession.middleware';

const router = Router();

router.post('/upload', validateSessionMiddleware, uploadOtpVideo);

export default router;
