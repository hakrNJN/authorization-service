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

            // Strategy: Select policy based on the resource name, or fall back to 'default' or 'main'.
            // If the resource is 'accounts', look for a policy named 'accounts' or 'policy.accounts'.
            const resourceName = typeof check.resource === 'string' ? check.resource : check.resource.type;
            let policyEntity = policies.find(p => p.policyName === resourceName || p.policyName === `policy.${resourceName}`);

            if (!policyEntity) {
                // Fallback to a default policy if it exists
                policyEntity = policies.find(p => p.policyName === 'default' || p.policyName === 'main' || p.policyName === 'policy.main');
            }

            if (!policyEntity) {
                this.logger.warn(`No matching policy found for resource '${check.resource}' and no default policy available. Denying access.`);
                return { allowed: false, reason: 'No applicable policy found' };
            }

            const policyDefinition = policyEntity.policyDefinition;

            const input = {
                subject: check.subject,
                action: check.action,
                resource: check.resource,
                context: check.context,
            };

            const result = await this.regoEngine.evaluate(policyDefinition, input);

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

    public async testPolicy(policy: string, input: unknown, query: string = 'data.authz.allow'): Promise<any> {
        this.logger.debug('Testing policy', { policyLength: policy.length, input, query });

        try {
            if (!policy) {
                throw new ValidationError('Policy string cannot be empty for testing.');
            }
            // The regoEngine.evaluate method is designed to take the raw policy string
            const result = await this.regoEngine.evaluate(policy, input, query);
            this.logger.info('Policy test evaluation completed.', { query, result });
            return result;
        } catch (error: any) {
            this.logger.error('Error during policy test evaluation', { error });
            if (error instanceof ValidationError) {
                throw error;
            }
            throw new PolicyEvaluationError(`Failed to test policy: ${error.message}`, error);
        }
    }
}
