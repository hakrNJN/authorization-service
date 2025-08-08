
import { Policy } from '../../domain/entities/Policy';

export interface IPolicyRepository {
    getPolicies(): Promise<Policy[]>;
    getPolicy(id: string): Promise<Policy | null>;
    createPolicy(policy: Policy): Promise<Policy>;
    updatePolicy(id: string, policy: Partial<Policy>): Promise<Policy | null>;
    deletePolicy(id: string): Promise<void>;
}
