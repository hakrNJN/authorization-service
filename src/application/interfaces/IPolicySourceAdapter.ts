/**
 * Defines the structure for a permission, including potential conditions for ABAC.
 */
export interface PermissionDefinition {
    name: string; // e.g., 'document:read', 'order:approve'
    description?: string;
    // Optional: Add fields for conditions if your policy engine uses them explicitly here
    // condition?: { field: string; operator: string; value: any };
}

/**
 * Defines the contract for fetching authorization policies, roles, groups,
 * permissions, and their relationships from an external source
 * (typically the User Management Service).
 */
export interface IPolicySourceAdapter {
    /**
     * Fetches the names of groups a user belongs to.
     * @param userId - The unique ID of the user.
     * @returns A promise resolving to an array of group names.
     */
    getGroupsForUser(userId: string): Promise<string[]>;

    /**
     * Fetches the names of roles assigned to a specific group.
     * @param groupName - The name of the group.
     * @returns A promise resolving to an array of role names.
     */
    getRolesForGroup(groupName: string): Promise<string[]>;

    /**
     * Fetches the names of custom roles directly assigned to a specific user.
     * @param userId - The unique ID of the user.
     * @returns A promise resolving to an array of custom role names.
     */
    getCustomRolesForUser(userId: string): Promise<string[]>;

    /**
     * Fetches the permission definitions assigned to a specific role.
     * @param roleName - The name of the role.
     * @returns A promise resolving to an array of permission definitions.
     */
    getPermissionsForRole(roleName: string): Promise<PermissionDefinition[]>;

    /**
     * Fetches the custom permission definitions directly assigned to a specific user.
     * These might represent overrides or specific grants/denials.
     * @param userId - The unique ID of the user.
     * @returns A promise resolving to an array of custom permission definitions.
     */
    getCustomPermissionsForUser(userId: string): Promise<PermissionDefinition[]>;

    // Optional: Fetch additional user attributes if not all are in the JWT/subject context
    // getUserAttributes?(userId: string): Promise<Record<string, any>>;
}
