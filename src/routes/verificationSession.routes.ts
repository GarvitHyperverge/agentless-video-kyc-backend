import { Router } from 'express';
import {createVerificationSession} from '../controllers/verificationSession.controller';

const router = Router();

// Create a new verification session
router.post('/', createVerificationSession);
export default router;
