
import { IPolicySourceAdapter, PermissionDefinition } from '../../application/interfaces/IPolicySourceAdapter';
import { ILogger } from '../../application/interfaces/ILogger';
import { inject, injectable } from 'tsyringe';
import { TYPES } from '../../shared/constants/types';
import { IConfigService } from '../../application/interfaces/IConfigService';
import axios, { AxiosInstance } from 'axios';
import { applyCircuitBreaker } from '../resilience/applyResilience';
import { PolicyLoadError } from '../../domain/exceptions/AuthorizationError';

@injectable()
export class PolicyProvider implements IPolicySourceAdapter {
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
        });
        this.logger.info(`HttpPolicySourceAdapter initialized for URL: ${this.userMgmtBaseUrl}`);
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
            throw this.handlePolicySourceError(error, operationName);
        }
    }

    private handlePolicySourceError(error: any, operationName: string): Error {
        this.logger.error(`Error during ${operationName}`, { errorName: error?.name, errorMessage: error?.message });
        if (error.name === 'OpenCircuitError') {
            return new PolicyLoadError(`Cannot ${operationName}: User Management Service is unavailable (Circuit Breaker Open).`);
        }
        return new PolicyLoadError(`Failed to ${operationName}: ${error.message}`, error);
    }

    async getGroupsForUser(userId: string): Promise<string[]> {
        const operationName = 'getGroupsForUser';
        const result = await this.makeRequest<{ groups: Array<{ groupName: string }> }>({
            method: 'get',
            url: `/admin/users/${encodeURIComponent(userId)}/groups`,
        }, operationName);
        return result.groups?.map(g => g.groupName) || [];
    }

    async getRolesForGroup(groupName: string): Promise<string[]> {
        const operationName = 'getRolesForGroup';
        const result = await this.makeRequest<{ roles: string[] }>({
            method: 'get',
            url: `/admin/groups/${encodeURIComponent(groupName)}/roles`,
        }, operationName);
        return result.roles || [];
    }

    async getCustomRolesForUser(userId: string): Promise<string[]> {
        const operationName = 'getCustomRolesForUser';
        const result = await this.makeRequest<{ roles: string[] }>({
            method: 'get',
            url: `/admin/users/${encodeURIComponent(userId)}/custom-roles`,
        }, operationName);
        return result.roles || [];
    }

    async getPermissionsForRole(roleName: string): Promise<PermissionDefinition[]> {
        const operationName = 'getPermissionsForRole';
        const result = await this.makeRequest<{ permissions: PermissionDefinition[] }>({
            method: 'get',
            url: `/admin/roles/${encodeURIComponent(roleName)}/permissions`,
        }, operationName);
        return result.permissions || [];
    }

    async getCustomPermissionsForUser(userId: string): Promise<PermissionDefinition[]> {
        const operationName = 'getCustomPermissionsForUser';
        const result = await this.makeRequest<{ permissions: PermissionDefinition[] }>({
            method: 'get',
            url: `/admin/users/${encodeURIComponent(userId)}/custom-permissions`,
        }, operationName);
        return result.permissions || [];
    }
}
