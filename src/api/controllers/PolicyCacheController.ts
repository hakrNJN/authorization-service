import { NextFunction, Request, Response } from 'express';
import { inject, injectable } from 'tsyringe';
import { HttpStatusCode } from '../../application/enums/HttpStatusCode';
import { ILogger } from '../../application/interfaces/ILogger';
import { TYPES } from '../../shared/constants/types';
import { HttpPolicySourceAdapter } from '../../infrastructure/adapters/HttpPolicySourceAdapter';

@injectable()
export class PolicyCacheController {
    constructor(
        @inject(TYPES.Logger) private logger: ILogger,
        @inject(TYPES.PolicySourceAdapter) private policySourceAdapter: HttpPolicySourceAdapter // Inject the adapter
    ) {}

    public invalidateCache = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            this.policySourceAdapter.invalidateCache();
            res.status(HttpStatusCode.OK).json({ message: 'Policy cache invalidated successfully.' });
        } catch (error: any) {
            this.logger.error('Error invalidating policy cache', error);
            next(error);
        }
    };
}
