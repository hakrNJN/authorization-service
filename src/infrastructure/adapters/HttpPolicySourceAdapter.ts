import { inject, injectable } from 'tsyringe';
import { IPolicyRepository } from 'application/interfaces/IPolicyRepository';
import { IConfigService } from 'application/interfaces/IConfigService';
import { ILogger } from 'application/interfaces/ILogger';
import { TYPES } from 'shared/constants/types';
import { Policy } from 'domain/entities/Policy';
import axios, { AxiosInstance } from 'axios';
import { applyCircuitBreaker } from '../resilience/applyResilience';
import { PolicyLoadError } from '../../domain/exceptions/AuthorizationError';

// Define locally since IPolicySourceAdapter might be deprecated/removed
export interface PermissionDefinition {
    action: string;
    resource: string;
}

const cache = new Map<string, { policies: Policy[], timestamp: number }>();
const CACHE_TTL = 60000; // 1 minute

@injectable()
export class HttpPolicySourceAdapter implements IPolicyRepository {
    private readonly userManagementServiceUrl: string;
    private readonly httpClient: AxiosInstance;
    private circuitBreakerKey: string = 'userManagementApi';

    constructor(
        @inject(TYPES.ConfigService) private configService: IConfigService,
        @inject(TYPES.Logger) private logger: ILogger
    ) {
        this.userManagementServiceUrl = this.configService.getOrThrow('USER_MANAGEMENT_SERVICE_URL');
        this.httpClient = axios.create({
            baseURL: this.userManagementServiceUrl,
            timeout: this.configService.getNumber('POLICY_SOURCE_TIMEOUT_MS', 5000),
        });
        // Clear cache on startup
        cache.clear();
    }

    private async makeRequest<T>(config: { method: 'get', url: string }, operationName: string): Promise<T> {
        const requestFn = async () => {
            try {
                const response = await this.httpClient.request<T>(config);
                return response.data;
            } catch (error: any) {
                this.logger.error(`HTTP request failed for ${operationName} at ${config.url}`, {
                    status: error.response?.status,
                    data: error.response?.data,
                    message: error.message,
                });
                throw new Error(`Failed ${operationName}: ${error.response?.status || error.message}`);
            }
        };

        const resilientRequest = applyCircuitBreaker(requestFn, this.circuitBreakerKey, this.logger);

        try {
            return await resilientRequest();
        } catch (error: any) {
            this.logger.error(`Error during ${operationName}`, { errorName: error?.name, errorMessage: error?.message });
            if (error.name === 'OpenCircuitError') {
                throw new PolicyLoadError(`Cannot ${operationName}: User Management Service is unavailable (Circuit Breaker Open).`);
            }
            throw new PolicyLoadError(`Failed to ${operationName}: ${error.message}`, error);
        }
    }

    async getPolicies(): Promise<Policy[]> {
        const cachedData = cache.get('policies');
        if (cachedData && (Date.now() - cachedData.timestamp < CACHE_TTL)) {
            this.logger.info('Returning policies from cache');
            return cachedData.policies;
        }

        try {
            this.logger.info('Fetching policies from user-management-service');
            const response = await this.makeRequest<{ items: any[] }>({
                method: 'get',
                url: '/api/policies'
            }, 'getPolicies');

            // Validate response structure
            if (!response || !Array.isArray(response.items)) {
                this.logger.error('Invalid response structure from user-management-service', { data: response });
                return [];
            }

            const policies = response.items.map((item: any) => Policy.fromPersistence(item));
            cache.set('policies', { policies, timestamp: Date.now() });
            return policies;
        } catch (error: any) {
            // Already logged in makeRequest, but re-throw or handle specific policy load logic
            throw error;
        }
    }

    async getPolicy(id: string): Promise<Policy | null> {
        const policies = await this.getPolicies();
        return policies.find(p => p.id === id) || null;
    }

    async getGroupsForUser(userId: string): Promise<string[]> {
        const operationName = 'getGroupsForUser';
        try {
            const result = await this.makeRequest<{ groups: Array<{ groupName: string } | string> }>({
                method: 'get',
                url: `/admin/users/${encodeURIComponent(userId)}/groups`,
            }, operationName);

            if (!result || !result.groups) return [];

            return result.groups.map((g: any) => {
                if (typeof g === 'string') return g;
                return g.groupName;
            });
        } catch (error) {
            this.logger.warn(`Failed to fetch groups for user ${userId}. Returning empty list.`, { error });
            return [];
        }
    }

    async getRolesForGroup(groupName: string): Promise<string[]> {
        const operationName = 'getRolesForGroup';
        try {
            const result = await this.makeRequest<{ roles: string[] }>({
                method: 'get',
                url: `/admin/groups/${encodeURIComponent(groupName)}/roles`,
            }, operationName);
            return result.roles || [];
        } catch (error) {
            this.logger.warn(`Failed to fetch roles for group ${groupName}. Returning empty list.`, { error });
            return [];
        }
    }

    async getPermissionsForRole(roleName: string): Promise<PermissionDefinition[]> {
        const operationName = 'getPermissionsForRole';
        try {
            const result = await this.makeRequest<{ permissions: PermissionDefinition[] }>({
                method: 'get',
                url: `/admin/roles/${encodeURIComponent(roleName)}/permissions`,
            }, operationName);
            return result.permissions || [];
        } catch (error) {
            this.logger.warn(`Failed to fetch permissions for role ${roleName}. Returning empty list.`, { error });
            return [];
        }
    }

    async getCustomRolesForUser(userId: string): Promise<string[]> {
        return Promise.resolve([]);
    }

    async getCustomPermissionsForUser(userId: string): Promise<PermissionDefinition[]> {
        return Promise.resolve([]);
    }

    // Write operations - Not supported in Authorization Service
    async createPolicy(policy: Policy): Promise<Policy> {
        throw new Error('Method not implemented in Authorization Service (Read-Only).');
    }

    async updatePolicy(id: string, policy: Partial<Policy>): Promise<Policy | null> {
        throw new Error('Method not implemented in Authorization Service (Read-Only).');
    }

    async deletePolicy(id: string): Promise<void> {
        throw new Error('Method not implemented in Authorization Service (Read-Only).');
    }

    public invalidateCache(): void {
        cache.delete('policies');
        this.logger.info('Policy cache invalidated.');
    }
}
