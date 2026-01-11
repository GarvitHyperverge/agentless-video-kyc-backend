import { Router } from 'express';
import multer from 'multer';
import { uploadOtpVideo } from '../controllers/otpVideo.controller';
import { validateSessionMiddleware } from '../middleware/validateSession.middleware';

const router = Router();

const storage = multer.memoryStorage(); // use RAM

// Create multer instance with configuration options
const upload = multer({
  storage, // Use in-memory storage (file available as req.file.buffer)
  
  // File size limits
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit 
  },
  
  // File type validation - only accept video files
  fileFilter: (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
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

router.post('/upload', upload.single('video'), validateSessionMiddleware, uploadOtpVideo);

export default router;
