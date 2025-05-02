import axios, { AxiosInstance } from 'axios'; // Using axios for HTTP calls: pnpm add axios
import { inject, injectable } from 'tsyringe';
import { IConfigService } from '../../application/interfaces/IConfigService';
import { ILogger } from '../../application/interfaces/ILogger';
import { IPolicySourceAdapter, PermissionDefinition } from '../../application/interfaces/IPolicySourceAdapter';
import { PolicyLoadError } from '../../domain/exceptions/AuthorizationError';
import { TYPES } from '../../shared/constants/types';
import { applyCircuitBreaker } from '../resilience/applyResilience'; // Import resilience wrapper

@injectable()
export class HttpPolicySourceAdapter implements IPolicySourceAdapter {
    private readonly httpClient: AxiosInstance;
    private readonly userMgmtBaseUrl: string;
    private circuitBreakerKey: string = 'userManagementApi'; // Key for circuit breaker options

    constructor(
        @inject(TYPES.ConfigService) private configService: IConfigService,
        @inject(TYPES.Logger) private logger: ILogger,
    ) {
        this.userMgmtBaseUrl = this.configService.getOrThrow('USER_MANAGEMENT_SERVICE_URL');
        this.httpClient = axios.create({
            baseURL: this.userMgmtBaseUrl,
            timeout: this.configService.getNumber('POLICY_SOURCE_TIMEOUT_MS', 5000), // Configurable timeout
            // Add headers if needed (e.g., internal auth token between services)
            // headers: { 'Authorization': `Bearer ${internalToken}` }
        });
        this.logger.info(`HttpPolicySourceAdapter initialized for URL: ${this.userMgmtBaseUrl}`);
        // Ensure 'userManagementApi' options exist in circuit-breaker.config.ts
    }

    // Helper to wrap HTTP calls with circuit breaker and error handling
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
                // Throw a specific error to be caught by handlePolicySourceError
                throw new Error(`Failed ${operationName}: ${error.response?.status || error.message}`);
            }
        };

        const resilientRequest = applyCircuitBreaker(requestFn, this.circuitBreakerKey, this.logger);

        try {
            return await resilientRequest();
        } catch (error: any) {
            throw this.handlePolicySourceError(error, operationName);
        }
    }

    // Error handler for policy source calls
    private handlePolicySourceError(error: any, operationName: string): Error {
         this.logger.error(`Error during ${operationName}`, { errorName: error?.name, errorMessage: error?.message });
         if (error.name === 'OpenCircuitError') {
             return new PolicyLoadError(`Cannot ${operationName}: User Management Service is unavailable (Circuit Breaker Open).`);
         }
         // Map other potential errors (timeout, network error, specific 4xx/5xx from User Mgmt Service)
         return new PolicyLoadError(`Failed to ${operationName}: ${error.message}`, error);
    }


    // --- Interface Implementations ---

    async getGroupsForUser(userId: string): Promise<string[]> {
        // Assumes User Mgmt Service has endpoint like GET /admin/users/{userId}/groups (simplified)
        // The actual User Mgmt API might return Group objects, adjust accordingly
        const operationName = 'getGroupsForUser';
        const result = await this.makeRequest<{ groups: Array<{ groupName: string }> }>({
            method: 'get',
            url: `/admin/users/${encodeURIComponent(userId)}/groups`, // Adjust URL as per User Mgmt API
        }, operationName);
        return result.groups?.map(g => g.groupName) || [];
    }

    async getRolesForGroup(groupName: string): Promise<string[]> {
        // Assumes User Mgmt Service has endpoint like GET /admin/groups/{groupName}/roles
        const operationName = 'getRolesForGroup';
         const result = await this.makeRequest<{ roles: string[] }>({ // Assuming it returns role names directly
            method: 'get',
            url: `/admin/groups/${encodeURIComponent(groupName)}/roles`, // Adjust URL
        }, operationName);
        return result.roles || [];
    }

    async getCustomRolesForUser(userId: string): Promise<string[]> {
        // Assumes User Mgmt Service has endpoint like GET /admin/users/{userId}/custom-roles
        const operationName = 'getCustomRolesForUser';
         const result = await this.makeRequest<{ roles: string[] }>({
            method: 'get',
            url: `/admin/users/${encodeURIComponent(userId)}/custom-roles`, // Adjust URL
        }, operationName);
        return result.roles || [];
    }

    async getPermissionsForRole(roleName: string): Promise<PermissionDefinition[]> {
        // Assumes User Mgmt Service has endpoint like GET /admin/roles/{roleName}/permissions
        const operationName = 'getPermissionsForRole';
        const result = await this.makeRequest<{ permissions: PermissionDefinition[] }>({ // Expect PermissionDefinition structure
            method: 'get',
            url: `/admin/roles/${encodeURIComponent(roleName)}/permissions`, // Adjust URL
        }, operationName);
        return result.permissions || [];
    }

    async getCustomPermissionsForUser(userId: string): Promise<PermissionDefinition[]> {
         // Assumes User Mgmt Service has endpoint like GET /admin/users/{userId}/custom-permissions
        const operationName = 'getCustomPermissionsForUser';
        const result = await this.makeRequest<{ permissions: PermissionDefinition[] }>({
            method: 'get',
            url: `/admin/users/${encodeURIComponent(userId)}/custom-permissions`, // Adjust URL
        }, operationName);
        return result.permissions || [];
    }
}
