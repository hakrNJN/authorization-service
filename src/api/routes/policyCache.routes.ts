import { Router } from 'express';
import { container } from '../../container';
import { PolicyCacheController } from '../controllers/PolicyCacheController';
import { ILogger } from '../../application/interfaces/ILogger';
import { TYPES } from '../../shared/constants/types';
import { sharedSecretAuthMiddleware } from '../middlewares/sharedSecretAuth.middleware';

// Resolve dependencies
const policyCacheController = container.resolve(PolicyCacheController);
const logger = container.resolve<ILogger>(TYPES.Logger);

// Create router instance
const router = Router();

// TODO: Implement a strong authentication/authorization mechanism for this endpoint.
// This endpoint should only be callable by trusted services (e.g., user-management-service).
// Options: Shared secret, mTLS, IP whitelisting, JWT with specific claims.

router.post(
    '/invalidate-cache',
    sharedSecretAuthMiddleware(), // Apply shared secret authentication
    policyCacheController.invalidateCache
);

export default router;
