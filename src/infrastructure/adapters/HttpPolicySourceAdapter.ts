import { inject, injectable } from 'tsyringe';
import { IPolicySourceAdapter, PermissionDefinition } from 'application/interfaces/IPolicySourceAdapter';
import { IConfigService } from 'application/interfaces/IConfigService';
import { ILogger } from 'application/interfaces/ILogger';
import { TYPES } from 'shared/constants/types';
import { Policy } from 'domain/entities/Policy';
import axios from 'axios';

// TODO: For Wasm engine, this adapter should fetch compiled Wasm policy bundles instead of raw Rego policies.
// This might involve a new endpoint in user-management-service to serve Wasm bundles.

// TODO: Use a distributed cache like Redis in a production environment.
const cache = new Map<string, { policies: Policy[], timestamp: number }>();
const CACHE_TTL = 60000; // 1 minute

@injectable()
export class HttpPolicySourceAdapter implements IPolicySourceAdapter {
    private readonly userManagementServiceUrl: string;

    constructor(
        @inject(TYPES.ConfigService) private configService: IConfigService,
        @inject(TYPES.Logger) private logger: ILogger
    ) {
        this.userManagementServiceUrl = this.configService.getOrThrow('USER_MANAGEMENT_SERVICE_URL');
    }

    async getPolicies(): Promise<Policy[]> {
        const cachedData = cache.get('policies');
        if (cachedData && (Date.now() - cachedData.timestamp < CACHE_TTL)) {
            this.logger.info('Returning policies from cache');
            return cachedData.policies;
        }

        try {
            this.logger.info('Fetching policies from user-management-service');
            const response = await axios.get(`${this.userManagementServiceUrl}/api/policies`);
            const policies = response.data.items.map((item: any) => Policy.fromPersistence(item));
            cache.set('policies', { policies, timestamp: Date.now() });
            return policies;
        } catch (error: any) {
            this.logger.error('Error fetching policies from user-management-service', error);
            throw new Error('Failed to fetch policies');
        }
    }

    public invalidateCache(): void {
        cache.delete('policies');
        this.logger.info('Policy cache invalidated.');
    }

    // Dummy implementations to satisfy IPolicySourceAdapter interface
    async getGroupsForUser(userId: string): Promise<string[]> {
        this.logger.warn(`Dummy implementation: getGroupsForUser called for userId: ${userId}`);
        return Promise.resolve([]);
    }

    async getRolesForGroup(groupName: string): Promise<string[]> {
        this.logger.warn(`Dummy implementation: getRolesForGroup called for groupName: ${groupName}`);
        return Promise.resolve([]);
    }

    async getCustomRolesForUser(userId: string): Promise<string[]> {
        this.logger.warn(`Dummy implementation: getCustomRolesForUser called for userId: ${userId}`);
        return Promise.resolve([]);
    }

    async getPermissionsForRole(roleName: string): Promise<PermissionDefinition[]> {
        this.logger.warn(`Dummy implementation: getPermissionsForRole called for roleName: ${roleName}`);
        return Promise.resolve([]);
    }

    async getCustomPermissionsForUser(userId: string): Promise<PermissionDefinition[]> {
        this.logger.warn(`Dummy implementation: getCustomPermissionsForUser called for userId: ${userId}`);
        return Promise.resolve([]);
    }
}
