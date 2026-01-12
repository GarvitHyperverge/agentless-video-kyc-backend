import { Router } from 'express';
import { uploadSessionRecording } from '../controllers/sessionRecording.controller';
import { jwtAuthMiddleware } from '../middleware/jwtAuth.middleware';
import { createVideoUpload } from '../utils/multer.util';

const router = Router();

/**
 * Upload Session Recording Endpoint
 * POST /api/session-recording/upload
 * 
 * Middleware chain:
 * 1. upload.single('video') - Processes the 'video' field from multipart/form-data
 *    - Validates file size (100MB) and type (video files)
 *    - Makes file available as req.file in the controller
 * 2. jwtAuthMiddleware - Validates JWT token and extracts sessionId
 * 3. uploadSessionRecording - Controller that handles the business logic
 */
// Create multer instance for video uploads (100MB limit)
const upload = createVideoUpload(100 * 1024 * 1024);

router.post('/upload', upload.single('video'), jwtAuthMiddleware, uploadSessionRecording);

export default router;
