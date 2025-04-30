import { z } from 'zod';

// Define Zod schema for the subject part of the context
const SubjectSchema = z.object({
    id: z.string({ required_error: "Subject ID is required" }).min(1),
    username: z.string().optional(),
    roles: z.array(z.string()).optional(),
    attributes: z.record(z.any()).optional(), // Allow any attributes passed from JWT
}).strict(); // Disallow extra properties in subject

// Define Zod schema for the resource part (allowing string or object)
const ResourceSchema = z.union([
    z.string({ required_error: "Resource must be a string or object" }).min(1),
    z.object({
        type: z.string({ required_error: "Resource type is required when resource is an object" }).min(1),
        id: z.string().optional(),
    }).catchall(z.any()), // Allow other properties on the resource object
]);

/**
 * Zod schema for validating the authorization check request payload
 * sent from the Gateway to the Authorization Service.
 */
export const AuthorizeSchema = z.object({
    body: z.object({
        subject: SubjectSchema,
        action: z.string({ required_error: "Action is required" }).min(1),
        resource: ResourceSchema,
        context: z.record(z.any()).optional(), // Allow any optional context
    }).strict(), // Disallow extra properties at the top level of the body
});

/**
 * TypeScript type inferred from the AuthorizeSchema's body definition.
 * Represents the expected input for the authorization check endpoint.
 */
export type AuthorizeDto = z.infer<typeof AuthorizeSchema>['body'];

