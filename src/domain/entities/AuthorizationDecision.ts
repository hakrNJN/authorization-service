/**
 * Represents the result of an authorization check.
 */
export interface AuthorizationDecision {
    /**
     * Whether the action is allowed or denied.
     */
    allowed: boolean;

    /**
     * Optional: A reason for the decision, especially for denials.
     * Useful for logging or potentially providing feedback (use caution with sensitive info).
     */
    reason?: string;

    /**
     * Optional: Any obligations or advice associated with the decision
     * (e.g., fields to filter from response, required MFA step).
     */
    obligations?: any; // Structure depends on policy engine/needs
}
