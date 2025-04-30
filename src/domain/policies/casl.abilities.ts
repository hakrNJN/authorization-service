import { Ability, AbilityBuilder, AbilityClass } from '@casl/ability';
import { AdminUser } from '../../shared/types/admin-user.interface'; // Assuming admin context might be passed
import { AuthenticatedUser } from '../../shared/types/authenticated-user.interface'; // For regular users

// Define actions users can perform
export type Actions = 'read' | 'create' | 'update' | 'delete' | 'manage'; // 'manage' is a wildcard for all actions

// Define subjects (resources) users can interact with
// Use 'all' as a wildcard for any subject
// Use classes for type checking if resources are represented by classes
// type Subjects = InferSubjects<typeof Article | typeof UserProfile | 'UserProfile'> | 'all';
// For simpler resource strings/objects:
type Subjects = string | { type: string; [key: string]: any } | 'all';

// Define the Ability type using CASL
export type AppAbility = Ability<[Actions, Subjects]>;
export const AppAbility = Ability as AbilityClass<AppAbility>;

/**
 * Defines the abilities (permissions) for different user roles or contexts.
 *
 * @param user - The authenticated user context (either regular or admin).
 * @returns An instance of AppAbility containing the defined rules.
 */
export function defineAbilitiesFor(user: AuthenticatedUser | AdminUser | null) {
    const { can, cannot, build } = new AbilityBuilder<AppAbility>(AppAbility);

    // --- Define Role-Based Rules ---
    const roles = user?.roles || []; // Get roles from user context

    if (roles.includes('admin')) {
        // Admins can manage (do anything) on all resources
        can('manage', 'all');
        // Optional: Add specific restrictions for admins if needed
        // cannot('delete', 'SuperAdminAccount');
    } else if (roles.includes('editor')) {
        // Editors can read all user profiles
        can('read', 'UserProfile');
        // Editors can update specific fields of user profiles (example using conditions)
        can('update', 'UserProfile', ['name', 'website']); // Allow updating only 'name' and 'website' fields
        // Editors can manage blog posts (example resource type)
        can('manage', 'BlogPost');
    } else if (roles.includes('viewer')) {
        // Viewers can only read specific resources
        can('read', 'UserProfile', ['name', 'email']); // Only specific fields
        can('read', 'BlogPost');
    } else {
        // --- Define Rules for Regular Authenticated Users (No specific role or default role) ---
        if (user) { // Check if user is authenticated
            // Users can read their own profile
            // Example using conditions based on user ID
            can('read', 'UserProfile', { userId: user.id }); // Match resource object's userId property
            // Users can update specific fields of their own profile
            can('update', 'UserProfile', ['name', 'website', 'preferred_username'], { userId: user.id });

            // Users can manage their own settings (example)
            can('manage', 'AccountSettings', { ownerId: user.id });
        }
        // --- Define Rules for Guests (Unauthenticated users) ---
        else {
            // Guests can read public blog posts (example)
            can('read', 'BlogPost', { isPublic: true });
        }
    }

    // --- Define Attribute-Based Rules (Example) ---
    if (user?.attributes?.['custom:department'] === 'billing') {
        // Users in the billing department can read invoices
        can('read', 'Invoice');
    }
    if (user?.attributes?.['custom:clearanceLevel'] >= 5) {
         // Users with high clearance can access sensitive reports
         can('read', 'SensitiveReport');
    }


    // Build and return the ability instance
    return build({
        // Function to detect subject type (useful if using classes as subjects)
        // detectSubjectType: item => item.constructor as ExtractSubjectType<Subjects>
        // For string/object resources, detection might be simpler or handled explicitly
        detectSubjectType: subject => {
            if (typeof subject === 'object' && subject !== null && subject.type) {
                return subject.type; // Use the 'type' property of the resource object
            }
            // Fallback for string resources or simple objects without 'type'
            // This part might need adjustment based on how you represent resources
            return typeof subject === 'string' ? subject : 'unknown';
        }
    });
}
