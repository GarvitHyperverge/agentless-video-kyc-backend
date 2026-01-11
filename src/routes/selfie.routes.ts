import { Router } from 'express';
import { uploadSelfie } from '../controllers/selfie.controller';
import { validateSessionMiddleware } from '../middleware/validateSession.middleware';
import { createImageUpload } from '../utils/multer.util';

const router = Router();

// Create multer instance for image uploads (10MB limit)
const upload = createImageUpload(10 * 1024 * 1024);

router.post('/upload', upload.single('image'), validateSessionMiddleware, uploadSelfie);

export default router;
