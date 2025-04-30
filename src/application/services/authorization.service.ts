import { Subject } from '@casl/ability'; // Import CASL types
import { inject, injectable } from 'tsyringe';
import { AuthorizationDecision } from '../../domain/entities/AuthorizationDecision';
import { PermissionCheck } from '../../domain/entities/PermissionCheck';
import { PolicyEvaluationError } from '../../domain/exceptions/AuthorizationError';
import { defineAbilitiesFor } from '../../domain/policies/casl.abilities'; // Import policy definition logic
import { TYPES } from '../../shared/constants/types';
import { IAuthorizationService } from '../interfaces/IAuthorizationService';
import { ILogger } from '../interfaces/ILogger';
// Import IPolicySourceAdapter if fetching policies externally
// import { IPolicySourceAdapter } from '../interfaces/IPolicySourceAdapter';

@injectable()
export class AuthorizationService implements IAuthorizationService {

    constructor(
        @inject(TYPES.Logger) private logger: ILogger,
        // Optional: Inject policy source adapter if policies are external
        // @inject(TYPES.PolicySourceAdapter) private policySource: IPolicySourceAdapter
    ) {
        this.logger.info('AuthorizationService initialized.');
        // Optional: Load policies on startup if needed
        // this.loadPolicies();
    }

    // Optional: Method to load/reload policies if they are external
    // private async loadPolicies(): Promise<void> {
    //     try {
    //         const policyData = await this.policySource.getPolicies();
    //         // Process/compile policyData for the chosen engine (e.g., OPA, CASL)
    //         this.logger.info('Authorization policies loaded/reloaded successfully.');
    //     } catch (error) {
    //         this.logger.error('Failed to load authorization policies', error);
    //         // Decide if this is a fatal error during startup
    //     }
    // }

    /**
     * Checks permissions using the defined CASL abilities.
     */
    async checkPermission(check: PermissionCheck): Promise<AuthorizationDecision> {
        this.logger.debug('Checking permission', { check });

        try {
            // 1. Define abilities based on the user context from the check
            // Pass the subject from the check directly
            const ability = defineAbilitiesFor(check.subject);

            // 2. Determine the CASL subject representation
            // If resource is a string like 'UserProfile', use it directly.
            // If resource is an object like { type: 'UserProfile', userId: '123' },
            // CASL needs the type ('UserProfile') and the object itself for condition checks.
            let caslSubject: Subject;
            if (typeof check.resource === 'string') {
                caslSubject = check.resource;
            } else if (typeof check.resource === 'object' && check.resource !== null && check.resource.type) {
                // Use CASL's subject helper or manually create structure if needed
                // For CASL, often pass the object directly if detectSubjectType is configured
                caslSubject = check.resource;
            } else {
                this.logger.error('Invalid resource format for permission check', { resource: check.resource });
                throw new PolicyEvaluationError('Invalid resource format provided.');
            }

            // 3. Perform the check using CASL's 'can' method
            const isAllowed = ability.can(check.action, caslSubject);

            // 4. Construct the decision
            const decision: AuthorizationDecision = {
                allowed: isAllowed,
                reason: isAllowed ? 'Allowed by policy' : 'Denied by policy', // Simple reason
            };

            this.logger.info(`Permission check result for action '${check.action}' on resource '${JSON.stringify(check.resource)}'`, {
                userId: check.subject.id,
                allowed: decision.allowed,
            });

            return decision;

        } catch (error: any) {
            this.logger.error('Error during policy evaluation', { check, error });
            // Catch specific policy engine errors if possible
            // Re-throw as a domain exception
            throw new PolicyEvaluationError(`Failed to evaluate permission: ${error.message}`, error);
        }
    }
}
