export class Policy {
    id: string;
    policyName: string;
    policyDefinition: string; // The Rego policy code
    policyLanguage: string;
    version: number;

    constructor(id: string, policyName: string, policyDefinition: string, policyLanguage: string, version: number) {
        this.id = id;
        this.policyName = policyName;
        this.policyDefinition = policyDefinition;
        this.policyLanguage = policyLanguage;
        this.version = version;
    }

    static fromPersistence(data: any): Policy {
        // Validation to ensure data contract is met
        if (!data.id || !data.policyName || !data.policyDefinition) {
            // Fallback for transition if needed, or throw
            if (data.name && data.policy) {
                 // Attempt to adapt old format if mixed env (unlikely but safe)
                 return new Policy(data.id, data.name, data.policy, 'rego', 1);
            }
            throw new Error('Invalid policy data for persistence: Missing required fields (id, policyName, policyDefinition).');
        }
        return new Policy(
            data.id, 
            data.policyName, 
            data.policyDefinition, 
            data.policyLanguage || 'rego', 
            data.version || 1
        );
    }
}
