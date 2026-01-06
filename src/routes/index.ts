import { Router } from 'express';
import healthRoutes from './health.routes';
import verificationSessionRoutes from './verificationSession.routes';

const router = Router();

router.use('/health', healthRoutes);
router.use('/verification-sessions', verificationSessionRoutes);

export default router;
