import { AuthorizationDecision } from "../../domain/entities/AuthorizationDecision"; // Import domain entity
import { PermissionCheck } from "../../domain/entities/PermissionCheck"; // Import domain entity

/**
 * Defines the contract for the core Authorization Service logic.
 * Its primary responsibility is to evaluate permissions based on input context.
 */
export interface IAuthorizationService {
    /**
     * Checks if a user/subject has permission to perform an action on a resource.
     * @param check - An object containing the context for the permission check
     * (user claims/attributes, action, resource details).
     * @returns A promise resolving to an AuthorizationDecision object (allow/deny).
     * @throws {PolicyEvaluationError | BaseError} For evaluation failures or unexpected errors.
     */
    checkPermission(check: PermissionCheck): Promise<AuthorizationDecision>;

    /**
     * Evaluates a given Rego policy with provided input data and query.
     * This is intended for testing and debugging policies.
     * @param policy - The Rego policy string to evaluate.
     * @param input - The input data for the policy evaluation.
     * @param query - The Rego query to execute (e.g., "data.my_policy.allow").
     * @returns A promise resolving to the raw evaluation result from the Rego engine.
     * @throws {PolicyEvaluationError | BaseError} For evaluation failures or unexpected errors.
     */
    testPolicy(policy: string, input: unknown, query?: string): Promise<any>;

    // Potentially add other methods if needed, e.g.:
    // listPermissions(subject: UserContext): Promise<Permission[]>;
    // reloadPolicies(): Promise<void>; // If policies are loaded dynamically
}
