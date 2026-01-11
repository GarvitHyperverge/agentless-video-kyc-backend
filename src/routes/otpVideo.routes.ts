import { Router } from 'express';
import { uploadOtpVideo } from '../controllers/otpVideo.controller';
import { validateSessionMiddleware } from '../middleware/validateSession.middleware';
import { createVideoUpload } from '../utils/multer.util';

const router = Router();

// Create multer instance for video uploads (50MB limit)
const upload = createVideoUpload(50 * 1024 * 1024);

router.post('/upload', upload.single('video'), validateSessionMiddleware, uploadOtpVideo);

export default router;
