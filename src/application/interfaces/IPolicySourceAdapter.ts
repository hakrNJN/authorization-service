/**
 * Optional Interface: Defines the contract for fetching authorization policies
 * or related data from an external source (e.g., User Mgmt Service, DB, Git repo).
 * Only needed if policies are not self-contained within the Authorization Service.
 */
export interface IPolicySourceAdapter {
    /**
     * Fetches the relevant policies or policy data.
     * The exact parameters and return type depend heavily on the policy structure
     * and where they are stored.
     * @returns A promise resolving to the policy data (e.g., raw policy definitions, rules).
     */
    getPolicies(): Promise<any>; // Replace 'any' with a specific type representing your policy structure

    // Add methods to fetch specific user attributes or roles if needed for evaluation,
    // e.g., getUserAttributes(userId: string): Promise<Record<string, any>>;
}
