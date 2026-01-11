import { Router } from 'express';
import multer from 'multer';
import { uploadSelfie } from '../controllers/selfie.controller';
import { validateSessionMiddleware } from '../middleware/validateSession.middleware';

const router = Router();

const storage = multer.memoryStorage(); // use RAM

// Create multer instance with configuration options
const upload = multer({
  storage, // Use in-memory storage (file available as req.file.buffer)
  
  // File size limits
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit (matches frontend validation)
  },
  
  // File type validation - only accept image files
  fileFilter: (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    // Accept various image formats
    if (file.mimetype === 'image/png' || 
        file.mimetype === 'image/jpeg' || 
        file.mimetype === 'image/jpg' ||
        file.mimetype.startsWith('image/')) {
      // Accept the file - callback with no error and true
      cb(null, true);
    } else {
      // Reject the file - callback with error message
      cb(new Error('Invalid file type. Only image files are allowed.'));
    }
  },
});

router.post('/upload', upload.single('image'), validateSessionMiddleware, uploadSelfie);

export default router;
