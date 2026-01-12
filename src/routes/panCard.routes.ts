import { Router } from 'express';
import { uploadPanCardImages } from '../controllers/panCard.controller';
import { jwtAuthMiddleware } from '../middleware/jwtAuth.middleware';
import { createImageUpload } from '../utils/multer.util';

const router = Router();

// Create multer instance for image uploads (10MB limit per file)
const upload = createImageUpload(10 * 1024 * 1024);

router.post('/', upload.fields([
  { name: 'front_image', maxCount: 1 },
  { name: 'back_image', maxCount: 1 }
]), jwtAuthMiddleware, uploadPanCardImages);

export default router;
