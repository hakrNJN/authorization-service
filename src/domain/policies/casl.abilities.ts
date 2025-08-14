import { AbilityBuilder, AbilityClass, ExtractSubjectType, PureAbility } from '@casl/ability'; // Use PureAbility

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
// export function defineAbilitiesForExtractedData(
//     subjectContext: AuthenticatedUser | AdminUser | null, // Accept user context or null for guest
//     aggregatedPermissions: PolicyRule[]
// ): AppAbility {
//     // Use PureAbility instead of the deprecated Ability class
//     const { can, cannot, build } = new AbilityBuilder<AppAbility>(PureAbility as AbilityClass<AppAbility>);

//     const userId = subjectContext?.id;
//     const attributes = subjectContext?.attributes || {};
//     const roles = (subjectContext as AuthenticatedUser | AdminUser)?.roles || []; // Get roles if needed for broad checks

//     // --- Apply rules based on the aggregated permissions ---
//     // This assumes permission names follow a convention like 'resource:action' or similar
//     // Or that PermissionDefinition contains explicit action/resource fields.
//     aggregatedPermissions.forEach(permission => {
//         const { action, subject, fields, conditions } = permission;

//         if (!['read', 'create', 'update', 'delete', 'manage'].includes(action)) {
//             console.warn(`Invalid action '${action}' found in permission`);
//             return;
//         }

//         can(action as Actions, subject, fields, conditions);
//     });

//     // --- Apply Generic Authenticated User Rules (If applicable and not covered by specific perms) ---
//     if (userId) {
//         // Example: All authenticated users can read their own basic profile info
//         // This might be granted via a default role/permission OR defined here as a baseline
//         // can('read', 'UserProfile', ['id', 'username', 'email'], { id: userId }); // Example: allow reading specific fields of own profile
//     }

//     // --- Apply Role-Based Overrides/Defaults (Optional) ---
//     // Sometimes broad role permissions are easier to manage here than as individual permission entries
//     if (roles.includes('admin')) {
//         can('manage', 'all'); // Admins override everything
//     }

//     // --- Apply ABAC Rules based on subject attributes ---
//     // These can add permissions OR add restrictions (cannot)
//     if (attributes['custom:department'] === 'support') {
//         can('read', 'Ticket'); // Grant permission based on attribute
//     }
//     if (attributes['custom:isAccountLocked'] === 'true') {
//         cannot('manage', 'all'); // Deny all actions if account is locked
//     }


//     // Build and return the ability instance
//     return build({
//         // Function to detect subject type
//         detectSubjectType: subject => {
//             if (typeof subject === 'object' && subject !== null && subject.type) {
//                 return subject.type as ExtractSubjectType<Subjects>; // Use 'type' property
//             }
//             if (typeof subject === 'string') {
//                  return subject as ExtractSubjectType<Subjects>; // Handle string subjects
//             }
//             // Fallback or throw error for unknown subject types
//             return 'unknown' as ExtractSubjectType<Subjects>;
//         }
//     });
// }
