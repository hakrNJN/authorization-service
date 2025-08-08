import { inject, injectable } from 'tsyringe';
import { AuthorizationDecision } from '../../domain/entities/AuthorizationDecision';
import { PermissionCheck } from '../../domain/entities/PermissionCheck';
import { PolicyEvaluationError, PolicyLoadError } from '../../domain/exceptions/AuthorizationError';
import { TYPES } from '../../shared/constants/types';
import { IAuthorizationService } from '../interfaces/IAuthorizationService';
import { ILogger } from '../interfaces/ILogger';
import { ValidationError } from '../../shared/errors/BaseError';
import { IRegoEngine } from '../interfaces/IRegoEngine';
import { IPolicyRepository } from '../interfaces/IPolicyRepository';

@injectable()
export class AuthorizationService implements IAuthorizationService {

    constructor(
        @inject(TYPES.Logger) private logger: ILogger,
        @inject(TYPES.RegoEngine) private regoEngine: IRegoEngine,
        @inject(TYPES.PolicyRepository) private policyRepository: IPolicyRepository
    ) {
        this.logger.info('AuthorizationService initialized.');
    }

    public async checkPermission(check: PermissionCheck): Promise<AuthorizationDecision> {
        this.logger.debug('Checking permission', { check });

        try {
            if (!check.action || !check.resource) {
                throw new ValidationError('Action and resource are required for permission check.');
            }

            const policies = await this.policyRepository.getPolicies();
            if (!policies || policies.length === 0) {
                throw new PolicyLoadError('No policies found.');
            }

            // For simplicity, this example uses the first policy. A real implementation
            // would need a strategy to select the correct policy.
            const policy = policies[0].rules.map(rule => rule.policy).join('\n');

            const input = {
                subject: check.subject,
                action: check.action,
                resource: check.resource,
                context: check.context,
            };

            const result = await this.regoEngine.evaluate(policy, input);

            const decision: AuthorizationDecision = {
                allowed: result.allow,
                reason: result.reason || (result.allow ? 'Allowed by policy' : 'Denied by policy'),
            };

            this.logger.info(`Permission check result for action '${check.action}' on resource '${JSON.stringify(check.resource)}'`, {
                userId: check.subject.id,
                allowed: decision.allowed,
            });

            return decision;

        } catch (error: any) {
            this.logger.error('Error during policy evaluation or data gathering', { check, error });
            if (error instanceof PolicyLoadError || error instanceof PolicyEvaluationError || error instanceof ValidationError) {
                throw error;
            }
            throw new PolicyEvaluationError(`Failed to evaluate permission: ${error.message}`, error);
        }
    }
}
