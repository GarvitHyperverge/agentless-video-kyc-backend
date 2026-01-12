import { Router } from 'express';
import { uploadSelfie } from '../controllers/selfie.controller';
import { jwtAuthMiddleware } from '../middleware/jwtAuth.middleware';
import { createImageUpload } from '../utils/multer.util';

const router = Router();

// Create multer instance for image uploads (10MB limit)
const upload = createImageUpload(10 * 1024 * 1024);

router.post('/upload', upload.single('image'), jwtAuthMiddleware, uploadSelfie);

export default router;
