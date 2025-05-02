import { inject, injectable } from 'tsyringe';
import { AuthorizationDecision } from '../../domain/entities/AuthorizationDecision';
import { PermissionCheck } from '../../domain/entities/PermissionCheck';
// Import the updated policy definition function and Actions/Subjects types
import { PolicyEvaluationError, PolicyLoadError } from '../../domain/exceptions/AuthorizationError';
import { Actions, AppAbility, defineAbilitiesForExtractedData, Subjects } from '../../domain/policies/casl.abilities'; // Import Subjects type and AppAbility
import { TYPES } from '../../shared/constants/types';
import { IAuthorizationService } from '../interfaces/IAuthorizationService';
import { ILogger } from '../interfaces/ILogger';
// Import the new Policy Source Adapter interface and its PermissionDefinition type
import { ValidationError } from '../../shared/errors/BaseError'; // Import ValidationError
import { AuthenticatedUser } from '../../shared/types/authenticated-user.interface'; // Import user type
import { IPolicySourceAdapter, PermissionDefinition } from '../interfaces/IPolicySourceAdapter';

@injectable()
export class AuthorizationService implements IAuthorizationService {

    constructor(
        @inject(TYPES.Logger) private logger: ILogger,
        // Inject the policy source adapter
        @inject(TYPES.PolicySourceAdapter) private policySourceAdapter: IPolicySourceAdapter
    ) {
        this.logger.info('AuthorizationService initialized.');
    }

    /**
     * Gathers all relevant permissions for a user based on their groups, roles,
     * custom assignments, and overrides.
     */
    private async gatherUserPermissions(userId: string): Promise<PermissionDefinition[]> {
        this.logger.debug(`Gathering permissions for user: ${userId}`);
        let allPermissions: PermissionDefinition[] = [];
        const fetchedRoleNames = new Set<string>(); // Avoid fetching perms for the same role multiple times

        try {
            // 1. Get user's groups
            const groupNames = await this.policySourceAdapter.getGroupsForUser(userId);
            this.logger.debug(`User ${userId} belongs to groups: ${groupNames.join(', ')}`);

            // 2. Get roles for each group
            const groupRolePromises = groupNames.map(groupName =>
                this.policySourceAdapter.getRolesForGroup(groupName)
            );
            const rolesFromGroupsArrays = await Promise.all(groupRolePromises);
            const rolesFromGroups = new Set(rolesFromGroupsArrays.flat()); // Flatten and deduplicate
            this.logger.debug(`Roles derived from groups for user ${userId}: ${Array.from(rolesFromGroups).join(', ')}`);

            // 3. Get user's custom roles
            const customRoles = await this.policySourceAdapter.getCustomRolesForUser(userId);
            this.logger.debug(`Custom roles for user ${userId}: ${customRoles.join(', ')}`);

            // 4. Combine all unique role names
            const allRoleNames = new Set([...rolesFromGroups, ...customRoles]);
            this.logger.debug(`Total unique roles to check for user ${userId}: ${Array.from(allRoleNames).join(', ')}`);


            // 5. Get permissions for each unique role
            const rolePermissionPromises = Array.from(allRoleNames).map(roleName => {
                if (!fetchedRoleNames.has(roleName)) {
                    fetchedRoleNames.add(roleName);
                    return this.policySourceAdapter.getPermissionsForRole(roleName);
                }
                return Promise.resolve([]); // Already fetched or no roles
            });
            const permissionsFromRolesArrays = await Promise.all(rolePermissionPromises);
            const permissionsFromRoles = permissionsFromRolesArrays.flat();
            this.logger.debug(`Permissions derived from roles for user ${userId}: ${permissionsFromRoles.map(p => p.name).join(', ')}`);


            // 6. Get user's custom permissions (overrides/direct grants)
            const customPermissions = await this.policySourceAdapter.getCustomPermissionsForUser(userId);
            this.logger.debug(`Custom permissions for user ${userId}: ${customPermissions.map(p => p.name).join(', ')}`);

            // 7. Combine and potentially deduplicate/handle overrides
            const combinedPermissionsMap = new Map<string, PermissionDefinition>();
            permissionsFromRoles.forEach(p => combinedPermissionsMap.set(p.name, p));
            customPermissions.forEach(p => combinedPermissionsMap.set(p.name, p)); // Custom permissions override role permissions

            allPermissions = Array.from(combinedPermissionsMap.values());
            this.logger.debug(`Final aggregated permissions for user ${userId}: ${allPermissions.map(p => p.name).join(', ')}`);

            return allPermissions;

        } catch (error: any) {
            this.logger.error(`Failed to gather permissions for user ${userId}`, error);
            throw new PolicyLoadError(`Failed to load policy data for user ${userId}: ${error.message}`, error);
        }
    }

    // Helper function to check if a string is a valid Action
    private isValidAction(action: string): action is Actions {
        return ['read', 'create', 'update', 'delete', 'manage'].includes(action);
    }

    // Helper function to validate and cast the resource to the expected Subjects type
    private getCaslSubject(resource: PermissionCheck['resource']): Subjects {
         if (typeof resource === 'string') {
            // Allow simple string subjects like 'UserProfile' or 'all'
            return resource;
        } else if (typeof resource === 'object' && resource !== null && typeof resource.type === 'string' && resource.type.length > 0) {
            // Resource object must have a non-empty 'type' property
            return resource as { type: string; [key: string]: any }; // Cast to the object part of Subjects union
        } else {
            this.logger.error('Invalid resource format for permission check', { resource });
            throw new PolicyEvaluationError('Invalid resource format provided. Must be a non-empty string or an object with a non-empty "type" property.');
        }
    }


    /**
     * Checks permissions based on aggregated policy data and context.
     */
    async checkPermission(check: PermissionCheck): Promise<AuthorizationDecision> {
        this.logger.debug('Checking permission', { check });

        try {
            // --- Input Validation ---
            if (!this.isValidAction(check.action)) {
                 this.logger.warn(`Invalid action provided for permission check: ${check.action}`);
                 throw new ValidationError(`Invalid action specified: ${check.action}.`);
            }
            const caslSubject = this.getCaslSubject(check.resource);
            // --- End Input Validation ---


            // 1. Gather all applicable permissions for the user
            const aggregatedPermissions = await this.gatherUserPermissions(check.subject.id);

            // 2. Define abilities based on the *aggregated* permissions and user attributes
            // Ensure defineAbilitiesForExtractedData returns the correct Ability type (AppAbility which extends PureAbility)
            const ability: AppAbility = defineAbilitiesForExtractedData(
                check.subject as AuthenticatedUser | null, // Cast subject to expected type
                aggregatedPermissions
            );

            // 3. Perform the check using CASL's 'can' method
            // No type assertion needed for action now due to validation above
            // caslSubject type is validated by getCaslSubject
            const isAllowed = ability.can(check.action, caslSubject);

            // 4. Construct the decision
            const decision: AuthorizationDecision = {
                allowed: isAllowed,
                reason: isAllowed ? 'Allowed by aggregated policy' : 'Denied by aggregated policy',
            };

            this.logger.info(`Permission check result for action '${check.action}' on resource '${JSON.stringify(check.resource)}'`, {
                userId: check.subject.id,
                allowed: decision.allowed,
            });

            return decision;

        } catch (error: any) {
            this.logger.error('Error during policy evaluation or data gathering', { check, error });
            if (error instanceof PolicyLoadError || error instanceof PolicyEvaluationError || error instanceof ValidationError) {
                throw error; // Re-throw known specific errors
            }
            // Wrap other unexpected errors
            throw new PolicyEvaluationError(`Failed to evaluate permission: ${error.message}`, error);
        }
    }
}
