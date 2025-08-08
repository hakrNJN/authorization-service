
import { IPolicySourceAdapter, PermissionDefinition } from '../../application/interfaces/IPolicySourceAdapter';
import { ILogger } from '../../application/interfaces/ILogger';
import { inject, injectable } from 'tsyringe';
import { TYPES } from '../../shared/constants/types';
import { IConfigService } from '../../application/interfaces/IConfigService';
import { PolicyProvider } from '../policy-provider/PolicyProvider';

@injectable()
export class PolicySourceAdapter implements IPolicySourceAdapter {
    private policyProvider: PolicyProvider;

    constructor(
        @inject(TYPES.ConfigService) private configService: IConfigService,
        @inject(TYPES.Logger) private logger: ILogger,
    ) {
        this.policyProvider = new PolicyProvider(this.configService, this.logger);
    }

    async getGroupsForUser(userId: string): Promise<string[]> {
        return this.policyProvider.getGroupsForUser(userId);
    }

    async getRolesForGroup(groupName: string): Promise<string[]> {
        return this.policyProvider.getRolesForGroup(groupName);
    }

    async getCustomRolesForUser(userId: string): Promise<string[]> {
        return this.policyProvider.getCustomRolesForUser(userId);
    }

    async getPermissionsForRole(roleName: string): Promise<PermissionDefinition[]> {
        return this.policyProvider.getPermissionsForRole(roleName);
    }

    async getCustomPermissionsForUser(userId: string): Promise<PermissionDefinition[]> {
        return this.policyProvider.getCustomPermissionsForUser(userId);
    }
}
