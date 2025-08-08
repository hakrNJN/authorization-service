
import { inject, injectable } from 'tsyringe';
import { Policy } from '../../domain/entities/Policy';
import { IPolicyRepository } from '../interfaces/IPolicyRepository';
import { TYPES } from '../../shared/constants/types';

@injectable()
export class PolicyService {
    constructor(
        @inject(TYPES.PolicyRepository) private policyRepository: IPolicyRepository
    ) { }

    async getPolicies(): Promise<Policy[]> {
        return this.policyRepository.getPolicies();
    }

    async getPolicy(id: string): Promise<Policy | null> {
        return this.policyRepository.getPolicy(id);
    }

    async createPolicy(policy: Policy): Promise<Policy> {
        return this.policyRepository.createPolicy(policy);
    }

    async updatePolicy(id: string, policy: Policy): Promise<Policy | null> {
        return this.policyRepository.updatePolicy(id, policy);
    }

    async deletePolicy(id: string): Promise<void> {
        return this.policyRepository.deletePolicy(id);
    }
}
