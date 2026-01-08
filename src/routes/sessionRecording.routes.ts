import { Router } from 'express';
import multer from 'multer';
import { uploadSessionRecording } from '../controllers/sessionRecording.controller';

const router = Router();

// Configure multer for in-memory storage (we'll handle file writing in the service)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept WebM video files
    if (file.mimetype === 'video/webm' || 
        file.mimetype === 'video/webm;codecs=vp8' ||
        file.mimetype === 'video/webm;codecs=vp9' ||
        file.mimetype === 'video/mp4' ||
        file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only video files are allowed.'));
    }
  },
});

// Upload session recording endpoint
router.post('/upload', upload.single('video'), uploadSessionRecording);

export default router;
