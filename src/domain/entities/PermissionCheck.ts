/**
 * Represents the input context for an authorization check.
 * This structure holds all necessary information to evaluate policies.
 */
export interface PermissionCheck {
    /**
     * Information about the user/subject attempting the action.
     * Derived from the validated JWT claims passed by the gateway.
     */
    subject: {
        id: string; // User ID (e.g., 'sub' claim)
        username?: string;
        roles?: string[]; // Roles/groups from token (e.g., 'cognito:groups')
        attributes?: Record<string, any>; // Other relevant claims/attributes
    };

    /**
     * The action being attempted (e.g., 'read', 'write', 'delete', 'approve').
     * Often corresponds to HTTP methods (GET, POST, PUT, DELETE) or custom actions.
     */
    action: string;

    /**
     * The resource being accessed or acted upon.
     * Can be a simple string (e.g., 'UserProfile', 'Order') or an object
     * with more details (e.g., { type: 'Order', id: '123', ownerId: 'abc' }).
     */
    resource: string | { type: string; id?: string; [key: string]: any };

    /**
     * Optional: Additional environmental context (e.g., IP address, time of day).
     */
    context?: Record<string, any>;
}
