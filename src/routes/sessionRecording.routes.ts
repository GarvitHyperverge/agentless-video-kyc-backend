import { Router } from 'express';
import multer from 'multer';
import { uploadSessionRecording } from '../controllers/sessionRecording.controller';
import { validateSessionMiddleware } from '../middleware/validateSession.middleware';

const router = Router();

/**
 * Multer Configuration for File Upload
 * 
 * Multer is middleware for handling multipart/form-data, which is used for file uploads.
 * This configuration sets up how files are stored and validated before reaching the controller.
 */
// Configure multer for in-memory storage (we'll handle file writing in the service)
// Memory storage keeps the file in RAM as a Buffer, which we then write to disk in the service
const storage = multer.memoryStorage();

// Create multer instance with configuration options
const upload = multer({
  storage, // Use in-memory storage (file available as req.file.buffer)
  
  // File size limits
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit (matches frontend validation)
  },
  
  // File type validation - only accept video files
  fileFilter: (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    // Check if the uploaded file is a video type
    // Accept various video formats: WebM (with different codecs), MP4, and any video/* MIME type
    if (file.mimetype === 'video/webm' || 
        file.mimetype === 'video/webm;codecs=vp8' ||
        file.mimetype === 'video/webm;codecs=vp9' ||
        file.mimetype === 'video/mp4' ||
        file.mimetype.startsWith('video/')) {
      // Accept the file - callback with no error and true
      cb(null, true);
    } else {
      // Reject the file - callback with error message
      cb(new Error('Invalid file type. Only video files are allowed.'));
    }
  },
});

/**
 * Upload Session Recording Endpoint
 * POST /api/session-recording/upload
 * 
 * Middleware chain:
 * 1. upload.single('video') - Processes the 'video' field from multipart/form-data
 *    - Validates file size and type based on multer config above
 *    - Makes file available as req.file in the controller
 *    - Makes other form fields (like session_id) available as req.body
 * 2. uploadSessionRecording - Controller that handles the business logic
 */
router.post('/upload', upload.single('video'), validateSessionMiddleware, uploadSessionRecording);

export default router;
