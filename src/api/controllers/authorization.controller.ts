import { NextFunction, Request, Response } from 'express';
import { inject, injectable } from 'tsyringe';
import { HttpStatusCode } from '../../application/enums/HttpStatusCode'; // Assuming defined
import { IAuthorizationService } from '../../application/interfaces/IAuthorizationService';
import { ILogger } from '../../application/interfaces/ILogger';
import { PermissionCheck } from '../../domain/entities/PermissionCheck'; // Domain entity
import { TYPES } from '../../shared/constants/types';
import { AuthorizeDto } from '../dtos/authorize.dto'; // DTO for the request body
import { TestPolicyRequestDto, TestPolicyRequestSchema, TestPolicyResponseDto } from '../dtos/test-policy.dto';

@injectable()
export class AuthorizationController {
    constructor(
        @inject(TYPES.AuthorizationService) private authorizationService: IAuthorizationService,
        @inject(TYPES.Logger) private logger: ILogger,
    ) { }

    /**
     * Handles authorization check requests from the Gateway.
     * POST /authorize (or similar endpoint)
     */
    checkPermission = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const requestId = req.id || 'N/A'; // Get request ID if available
        try {
            // Assuming validation middleware has run and req.body is AuthorizeDto
            const authorizeDto: AuthorizeDto = req.body;

            // Map DTO to the PermissionCheck domain entity
            const permissionCheck: PermissionCheck = {
                tenantId: authorizeDto.tenantId,
                subject: authorizeDto.subject,
                action: authorizeDto.action,
                resource: authorizeDto.resource,
                context: authorizeDto.context,
            };

            // Call the service to evaluate permission
            const decision = await this.authorizationService.checkPermission(permissionCheck);

            // Respond with the decision
            // Use 200 OK regardless of allow/deny, the decision is in the body
            res.status(HttpStatusCode.OK).json(decision);

        } catch (error) {
            this.logger.error(`[AuthorizationController - ${requestId}] Error processing authorization check`, error);
            // Pass error to the centralized error handler
            next(error);
        }
    };

    /**
     * Handles requests to test a Rego policy with provided input.
     * POST /test-policy
     */
    testPolicy = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const requestId = req.id || 'N/A';
        try {
            // Assuming validation middleware has run and req.body is TestPolicyRequestDto
            const { policy, input, query }: TestPolicyRequestDto = req.body;

            const result: TestPolicyResponseDto = await this.authorizationService.testPolicy(policy, input, query);

            res.status(HttpStatusCode.OK).json(result);
        } catch (error) {
            this.logger.error(`[AuthorizationController - ${requestId}] Error testing policy`, error);
            next(error);
        }
    };
}

