import { Router } from 'express';
import { ILogger } from '../../application/interfaces/ILogger';
import { container } from '../../container';
import { TYPES } from '../../shared/constants/types';
import { AuthorizationController } from '../controllers/authorization.controller';
import { AuthorizeSchema } from '../dtos/authorize.dto'; // Import Zod schema
import { validationMiddleware } from '../middlewares/validation.middleware'; // Import validation factory

// Resolve dependencies
const authorizationController = container.resolve(AuthorizationController);
const logger = container.resolve<ILogger>(TYPES.Logger);

// Create router instance
const router = Router();

// Define Authorization Route

// POST /authorize - Check Permission
router.post(
    '/authorize', // Endpoint the Gateway will call
    validationMiddleware(AuthorizeSchema, logger), // Validate the incoming context payload
    authorizationController.checkPermission
);

export default router;
