import multer from 'multer';

/**
 * Creates a multer instance for image uploads
 * @param maxFileSize - Maximum file size in bytes (default: 10MB)
 * @returns Configured multer instance for image uploads
 */
export const createImageUpload = (maxFileSize: number = 10 * 1024 * 1024): multer.Multer => {
  const storage = multer.memoryStorage();

  return multer({
    storage,
    limits: {
      fileSize: maxFileSize,
    },
    fileFilter: (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
      // Accept various image formats
      if (file.mimetype === 'image/png' || 
          file.mimetype === 'image/jpeg' || 
          file.mimetype === 'image/jpg' ||
          file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Only image files are allowed.'));
      }
    },
  });
};

/**
 * Creates a multer instance for video uploads
 * @param maxFileSize - Maximum file size in bytes (default: 50MB)
 * @returns Configured multer instance for video uploads
 */
export const createVideoUpload = (maxFileSize: number = 50 * 1024 * 1024): multer.Multer => {
  const storage = multer.memoryStorage();

  return multer({
    storage,
    limits: {
      fileSize: maxFileSize,
    },
    fileFilter: (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
      // Accept various video formats: WebM (with different codecs), MP4, and any video/* MIME type
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
};

/**
 * Creates a multer instance for audio uploads
 * @param maxFileSize - Maximum file size in bytes (default: 10MB)
 * @returns Configured multer instance for audio uploads
 */
export const createAudioUpload = (maxFileSize: number = 10 * 1024 * 1024): multer.Multer => {
  const storage = multer.memoryStorage();

  return multer({
    storage,
    limits: {
      fileSize: maxFileSize,
    },
    fileFilter: (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
      // Accept various audio formats: WAV, MP3, OGG, FLAC, and any audio/* MIME type
      if (file.mimetype === 'audio/wav' || 
          file.mimetype === 'audio/wave' ||
          file.mimetype === 'audio/x-wav' ||
          file.mimetype === 'audio/mp3' ||
          file.mimetype === 'audio/mpeg' ||
          file.mimetype === 'audio/ogg' ||
          file.mimetype === 'audio/flac' ||
          file.mimetype.startsWith('audio/')) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Only audio files are allowed.'));
      }
    },
  });
};
