import { Request, Response, NextFunction } from 'express';
import { container } from 'tsyringe';
import { IConfigService } from 'application/interfaces/IConfigService';
import { ILogger } from 'application/interfaces/ILogger';
import { TYPES } from 'shared/constants/types';
import { BaseError } from 'shared/errors/BaseError';

export function sharedSecretAuthMiddleware() {
    const logger = container.resolve<ILogger>(TYPES.Logger);
    const configService = container.resolve<IConfigService>(TYPES.ConfigService);
    const expectedSecret = configService.getOrThrow('SHARED_SECRET');

    return (req: Request, res: Response, next: NextFunction) => {
        const providedSecret = req.headers['x-shared-secret'] as string;

        if (!providedSecret || providedSecret !== expectedSecret) {
            logger.warn('Unauthorized access attempt to shared secret protected endpoint.');
            return next(new BaseError('UnauthorizedError', 401, 'Unauthorized: Invalid shared secret.', true));
        }

        next();
    };
}
