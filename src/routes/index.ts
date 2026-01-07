import { Router } from 'express';
import healthRoutes from './health.routes';
import verificationSessionRoutes from './verificationSession.routes';
import sessionMetadataRoutes from './sessionMetadata.routes';
import panCardRoutes from './panCard.routes';
import otpVideoRoutes from './otpVideo.routes';
import selfieRoutes from './selfie.routes';

const router = Router();

router.use('/health', healthRoutes);
router.use('/verification-sessions', verificationSessionRoutes);
router.use('/session-metadata', sessionMetadataRoutes);
router.use('/pan-card', panCardRoutes);
router.use('/otp-video', otpVideoRoutes);
router.use('/selfie', selfieRoutes);

export default router;
