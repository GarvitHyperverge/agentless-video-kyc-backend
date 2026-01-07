import { Router } from 'express';
import { uploadOtpVideo } from '../controllers/otpVideo.controller';

const router = Router();

router.post('/upload', uploadOtpVideo);

export default router;
