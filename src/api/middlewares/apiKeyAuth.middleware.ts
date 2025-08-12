import { Request, Response, NextFunction } from 'express';
import { container } from '../../container';
import { IConfigService } from '../../infrastructure/config/interfaces/IConfigService';
import { TYPES } from '../../shared/constants/types';
import { UnauthorizedError } from '../../shared/errors/UnauthorizedError';

export function apiKeyAuthMiddleware() {
    const configService = container.resolve<IConfigService>(TYPES.ConfigService);
    const expectedApiKey = configService.getOrThrow('POLICY_CACHE_API_KEY');

    return (req: Request, res: Response, next: NextFunction) => {
        const apiKey = req.headers['x-api-key'] as string;

        if (!apiKey || apiKey !== expectedApiKey) {
            return next(new UnauthorizedError('Invalid or missing API Key'));
        }
        next();
    };
}
