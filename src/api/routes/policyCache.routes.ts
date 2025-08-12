import { Router } from 'express';
import { container } from '../../container';
import { PolicyCacheController } from '../controllers/PolicyCacheController';
import { ILogger } from '../../application/interfaces/ILogger';
import { TYPES } from '../../shared/constants/types';
import { apiKeyAuthMiddleware } from '../middlewares/apiKeyAuth.middleware';

// Resolve dependencies
const policyCacheController = container.resolve(PolicyCacheController);
const logger = container.resolve<ILogger>(TYPES.Logger);

// Create router instance
const router = Router();

router.post(
    '/invalidate-cache',
    apiKeyAuthMiddleware(), // Apply API Key authentication
    policyCacheController.invalidateCache
);

export default router;
