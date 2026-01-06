import { Router } from 'express';
import { uploadPanCardImages } from '../controllers/panCard.controller';

const router = Router();

router.post('/', uploadPanCardImages);

export default router;
