import { Router } from 'express';
import healthRoutes from './health.routes';
import verificationSessionRoutes from './verificationSession.routes';
import sessionMetadataRoutes from './sessionMetadata.routes';

const router = Router();

router.use('/health', healthRoutes);
router.use('/verification-sessions', verificationSessionRoutes);
router.use('/session-metadata', sessionMetadataRoutes);

export default router;
