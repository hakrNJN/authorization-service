
export class Policy {
    id: string;
    name: string;
    policy: string; // This will store the Rego policy

    constructor(id: string, name: string, policy: string) {
        this.id = id;
        this.name = name;
        this.policy = policy;
    }

    static fromPersistence(data: any): Policy {
        // Assuming 'data' has 'id', 'name', 'policy' properties
        if (!data.id || !data.name || !data.policy) {
            throw new Error('Invalid policy data for persistence.');
        }
        return new Policy(data.id, data.name, data.policy);
    }
}
