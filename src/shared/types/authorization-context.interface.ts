/**
 * Defines the structure of the context object typically passed
 * from the Gateway to the Authorization Service for evaluation.
 * This mirrors the PermissionCheck entity but focuses on the data structure.
 */
export interface AuthorizationContext {
    /**
     * Information about the user/subject attempting the action.
     */
    subject: {
        id: string;
        username?: string;
        roles?: string[];
        attributes?: Record<string, any>;
    };

    /**
     * The action being attempted.
     */
    action: string;

    /**
     * The resource being accessed or acted upon.
     */
    resource: string | { type: string; id?: string; [key: string]: any };

    /**
     * Optional: Additional environmental context.
     */
    context?: Record<string, any>;
}
