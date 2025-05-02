import { AbilityBuilder, AbilityClass, ExtractSubjectType, PureAbility } from '@casl/ability'; // Use PureAbility
import { PermissionDefinition } from '../../application/interfaces/IPolicySourceAdapter'; // Import permission structure
import { AdminUser } from '../../shared/types/admin-user.interface';
import { AuthenticatedUser } from '../../shared/types/authenticated-user.interface';

// Define actions users can perform
export type Actions = 'read' | 'create' | 'update' | 'delete' | 'manage'; // 'manage' is a wildcard

// Define subjects (resources) users can interact with
// For simpler resource strings/objects:
export type Subjects = string | { type: string; [key: string]: any } | 'all';

// Define the Ability type using CASL with PureAbility
// Using PureAbility<[Actions, Subjects]> directly is often preferred
export type AppAbility = PureAbility<[Actions, Subjects]>;

/**
 * Defines the abilities (permissions) based on pre-fetched/aggregated permission data
 * and the user's context (attributes).
 *
 * @param subjectContext - The user context (id, attributes, etc.). Can be null for guests.
 * @param aggregatedPermissions - The list of all permissions applicable to the user, fetched externally.
 * @returns An instance of AppAbility containing the defined rules.
 */
export function defineAbilitiesForExtractedData(
    subjectContext: AuthenticatedUser | AdminUser | null, // Accept user context or null for guest
    aggregatedPermissions: PermissionDefinition[]
): AppAbility {
    // Use PureAbility instead of the deprecated Ability class
    const { can, cannot, build } = new AbilityBuilder<AppAbility>(PureAbility as AbilityClass<AppAbility>);

    const userId = subjectContext?.id;
    const attributes = subjectContext?.attributes || {};
    const roles = (subjectContext as AuthenticatedUser | AdminUser)?.roles || []; // Get roles if needed for broad checks

    // --- Apply rules based on the aggregated permissions ---
    // This assumes permission names follow a convention like 'resource:action' or similar
    // Or that PermissionDefinition contains explicit action/resource fields.
    aggregatedPermissions.forEach(permission => {
        // Example parsing logic (adjust based on your permissionName format)
        const parts = permission.name.split(':');
        let action: Actions | string = 'manage'; // Default or derive
        let resource: string = 'all'; // Default or derive

        if (parts.length >= 2) {
            resource = parts[0];
            action = parts[1];
        } else if (parts.length === 1) {
            // Assume it might be a resource name with implicit 'manage' or a specific action on 'all'
            // This needs a clear convention. Let's assume resource name for now.
            resource = parts[0];
            action = 'manage'; // Example default action
             console.warn(`Permission '${permission.name}' has only one part, assuming resource name with 'manage' action.`);
        } else {
             console.warn(`Could not parse action/resource from permission name: ${permission.name}`);
             return; // Skip invalid permission names
        }

        // Validate action if possible
        if (!['read', 'create', 'update', 'delete', 'manage'].includes(action)) {
             console.warn(`Invalid action '${action}' found in permission name: ${permission.name}`);
             // Decide how to handle: skip, default, throw? Skipping for now.
             return;
        }

        // TODO: Implement condition parsing if PermissionDefinition includes conditions
        // Example: const conditions = permission.condition ? parseCondition(permission.condition) : {};
        const conditions = {}; // Placeholder for ABAC conditions derived from the permission itself

        // Define the 'can' rule based on the parsed permission
        // Need to cast action to Actions type after validation
        can(action as Actions, resource, conditions);

        // Example: Add specific owner-based condition automatically if permission implies ownership
        // if (permission.name.endsWith(':own')) { // Assuming a naming convention like 'post:update:own'
        //     const baseResource = resource; // Or parse resource differently
        //     const baseAction = action;
        //     if (userId) {
        //          // Add condition that resource must have an ownerId matching the user
        //          can(baseAction as Actions, baseResource, { ownerId: userId });
        //     }
        // }
    });

    // --- Apply Generic Authenticated User Rules (If applicable and not covered by specific perms) ---
    if (userId) {
        // Example: All authenticated users can read their own basic profile info
        // This might be granted via a default role/permission OR defined here as a baseline
        // can('read', 'UserProfile', ['id', 'username', 'email'], { id: userId }); // Example: allow reading specific fields of own profile
    }

    // --- Apply Role-Based Overrides/Defaults (Optional) ---
    // Sometimes broad role permissions are easier to manage here than as individual permission entries
    if (roles.includes('admin')) {
        can('manage', 'all'); // Admins override everything
    }

    // --- Apply ABAC Rules based on subject attributes ---
    // These can add permissions OR add restrictions (cannot)
    if (attributes['custom:department'] === 'support') {
        can('read', 'Ticket'); // Grant permission based on attribute
    }
    if (attributes['custom:isAccountLocked'] === 'true') {
        cannot('manage', 'all'); // Deny all actions if account is locked
    }


    // Build and return the ability instance
    return build({
        // Function to detect subject type
        detectSubjectType: subject => {
            if (typeof subject === 'object' && subject !== null && subject.type) {
                return subject.type as ExtractSubjectType<Subjects>; // Use 'type' property
            }
            if (typeof subject === 'string') {
                 return subject as ExtractSubjectType<Subjects>; // Handle string subjects
            }
            // Fallback or throw error for unknown subject types
            return 'unknown' as ExtractSubjectType<Subjects>;
        }
    });
}
