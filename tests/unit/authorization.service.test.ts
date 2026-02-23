
import "reflect-metadata"; // Required for tsyringe
import { AuthorizationService } from "../../src/application/services/authorization.service";
import { ILogger } from "../../src/application/interfaces/ILogger";
import { IRegoEngine } from "../../src/application/interfaces/IRegoEngine";
import { IPolicyRepository } from "../../src/application/interfaces/IPolicyRepository";
import { PermissionCheck } from "../../src/domain/entities/PermissionCheck";
import { AuthorizationDecision } from "../../src/domain/entities/AuthorizationDecision";
import { PolicyLoadError, PolicyEvaluationError, AuthorizationError } from "../../src/domain/exceptions/AuthorizationError";
import { ValidationError } from "../../src/shared/errors/BaseError";

describe("AuthorizationService", () => {
    let authorizationService: AuthorizationService;
    let mockLogger: jest.Mocked<ILogger>;
    let mockRegoEngine: jest.Mocked<IRegoEngine>;
    let mockPolicyRepository: jest.Mocked<IPolicyRepository>;

    beforeEach(() => {
        mockLogger = {
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            debug: jest.fn(),
        };
        mockRegoEngine = {
            evaluate: jest.fn(),
        };
        mockPolicyRepository = {
            getPolicies: jest.fn(),
            getPolicy: jest.fn(),
            createPolicy: jest.fn(),
            updatePolicy: jest.fn(),
            deletePolicy: jest.fn(),
        };

        authorizationService = new AuthorizationService(
            mockLogger,
            mockRegoEngine,
            mockPolicyRepository
        );
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("checkPermission", () => {
        const mockPermissionCheck: PermissionCheck = {
            tenantId: "test-tenant",
            subject: { id: "user123", roles: ["admin"] },
            action: "read",
            resource: { type: "document", id: "doc456" },
            context: {},
        };
        const mockPolicy = {
            id: "policy1",
            policyName: "document",
            policyDefinition: `package authz
allow = true`,
            policyLanguage: "rego",
            version: 1
        };

        it("should return allowed: true when permission is granted by policy", async () => {
            mockPolicyRepository.getPolicies.mockResolvedValue([mockPolicy]);
            mockRegoEngine.evaluate.mockResolvedValue({ allow: true, reason: "Allowed by policy" });

            const result = await authorizationService.checkPermission(mockPermissionCheck);

            expect(result).toEqual({ allowed: true, reason: "Allowed by policy" });
            expect(mockLogger.debug).toHaveBeenCalledWith("Checking permission", { check: mockPermissionCheck });
            expect(mockPolicyRepository.getPolicies).toHaveBeenCalled();
            expect(mockRegoEngine.evaluate).toHaveBeenCalledWith(
                mockPolicy.policyDefinition,
                {
                    tenantId: "test-tenant",
                    subject: mockPermissionCheck.subject,
                    action: mockPermissionCheck.action,
                    resource: mockPermissionCheck.resource,
                    context: mockPermissionCheck.context,
                }
            );
            expect(mockLogger.info).toHaveBeenCalledWith(
                `Permission check result for action '${mockPermissionCheck.action}' on resource '${JSON.stringify(mockPermissionCheck.resource)}'`,
                { userId: mockPermissionCheck.subject.id, allowed: true }
            );
        });

        it("should return allowed: false when permission is denied by policy", async () => {
            mockPolicyRepository.getPolicies.mockResolvedValue([mockPolicy]);
            mockRegoEngine.evaluate.mockResolvedValue({ allow: false, reason: "Denied by policy" });

            const result = await authorizationService.checkPermission(mockPermissionCheck);

            expect(result).toEqual({ allowed: false, reason: "Denied by policy" });
            expect(mockLogger.debug).toHaveBeenCalledWith("Checking permission", { check: mockPermissionCheck });
            expect(mockPolicyRepository.getPolicies).toHaveBeenCalled();
            expect(mockRegoEngine.evaluate).toHaveBeenCalledWith(
                mockPolicy.policyDefinition,
                {
                    tenantId: "test-tenant",
                    subject: mockPermissionCheck.subject,
                    action: mockPermissionCheck.action,
                    resource: mockPermissionCheck.resource,
                    context: mockPermissionCheck.context,
                }
            );
            expect(mockLogger.info).toHaveBeenCalledWith(
                `Permission check result for action '${mockPermissionCheck.action}' on resource '${JSON.stringify(mockPermissionCheck.resource)}'`,
                { userId: mockPermissionCheck.subject.id, allowed: false }
            );
        });

        it("should throw ValidationError if action is missing", async () => {
            const invalidCheck = { ...mockPermissionCheck, action: undefined } as any;
            await expect(authorizationService.checkPermission(invalidCheck)).rejects.toThrow(ValidationError);
            await expect(authorizationService.checkPermission(invalidCheck)).rejects.toThrow("Action and resource are required for permission check.");
            expect(mockLogger.error).toHaveBeenCalled();
        });

        it("should throw ValidationError if resource is missing", async () => {
            const invalidCheck = { ...mockPermissionCheck, resource: undefined } as any;
            await expect(authorizationService.checkPermission(invalidCheck)).rejects.toThrow(ValidationError);
            await expect(authorizationService.checkPermission(invalidCheck)).rejects.toThrow("Action and resource are required for permission check.");
            expect(mockLogger.error).toHaveBeenCalled();
        });

        it("should throw PolicyLoadError if no policies are found", async () => {
            mockPolicyRepository.getPolicies.mockResolvedValue([]); // No policies
            await expect(authorizationService.checkPermission(mockPermissionCheck)).rejects.toThrow(PolicyLoadError);
            await expect(authorizationService.checkPermission(mockPermissionCheck)).rejects.toThrow("No policies found.");
            expect(mockLogger.error).toHaveBeenCalled();
        });

        it("should throw PolicyEvaluationError if regoEngine.evaluate throws an error", async () => {
            mockPolicyRepository.getPolicies.mockResolvedValue([mockPolicy]);
            const evaluationError = new Error("OPA evaluation failed");
            mockRegoEngine.evaluate.mockRejectedValue(evaluationError);

            await expect(authorizationService.checkPermission(mockPermissionCheck)).rejects.toThrow(PolicyEvaluationError);
            await expect(authorizationService.checkPermission(mockPermissionCheck)).rejects.toThrow("Failed to evaluate permission: OPA evaluation failed");
            expect(mockLogger.error).toHaveBeenCalledWith(
                "Error during policy evaluation or data gathering",
                expect.objectContaining({ check: mockPermissionCheck, error: evaluationError })
            );
        });

        it("should re-throw PolicyLoadError if caught", async () => {
            mockPolicyRepository.getPolicies.mockRejectedValue(new PolicyLoadError("DB error"));
            await expect(authorizationService.checkPermission(mockPermissionCheck)).rejects.toThrow(PolicyLoadError);
            expect(mockLogger.error).toHaveBeenCalled();
        });

        it("should re-throw PolicyEvaluationError if caught", async () => {
            mockPolicyRepository.getPolicies.mockResolvedValue([mockPolicy]);
            mockRegoEngine.evaluate.mockRejectedValue(new PolicyEvaluationError("Rego error"));
            await expect(authorizationService.checkPermission(mockPermissionCheck)).rejects.toThrow(PolicyEvaluationError);
            expect(mockLogger.error).toHaveBeenCalled();
        });

        it("should re-throw ValidationError if caught", async () => {
            const invalidCheck = { ...mockPermissionCheck, action: undefined } as any;
            // Simulate an internal validation error being thrown and caught
            mockPolicyRepository.getPolicies.mockImplementation(() => {
                throw new ValidationError("Internal validation issue");
            });
            await expect(authorizationService.checkPermission(invalidCheck)).rejects.toThrow(ValidationError);
            expect(mockLogger.error).toHaveBeenCalled();
        });
    });

    describe("testPolicy", () => {
        const mockPolicyString = `package test
allow = true`;
        const mockInput = { user: "test", action: "view" };
        const mockQuery = "data.test.allow";

        it("should return the evaluation result for a valid policy test", async () => {
            const mockResult = { allow: true, decision_id: "abc" };
            mockRegoEngine.evaluate.mockResolvedValue(mockResult);

            const result = await authorizationService.testPolicy(mockPolicyString, mockInput, mockQuery);

            expect(result).toEqual(mockResult);
            expect(mockLogger.debug).toHaveBeenCalledWith("Testing policy", {
                policyLength: mockPolicyString.length,
                input: mockInput,
                query: mockQuery,
            });
            expect(mockRegoEngine.evaluate).toHaveBeenCalledWith(mockPolicyString, mockInput, mockQuery);
            expect(mockLogger.info).toHaveBeenCalledWith("Policy test evaluation completed.", { query: mockQuery, result: mockResult });
        });

        it("should throw ValidationError if policy string is empty", async () => {
            await expect(authorizationService.testPolicy("", mockInput)).rejects.toThrow(ValidationError);
            await expect(authorizationService.testPolicy("", mockInput)).rejects.toThrow("Policy string cannot be empty for testing.");
            expect(mockLogger.error).toHaveBeenCalled();
        });

        it("should throw PolicyEvaluationError if regoEngine.evaluate throws an error during testPolicy", async () => {
            const evaluationError = new Error("OPA test evaluation failed");
            mockRegoEngine.evaluate.mockRejectedValue(evaluationError);

            await expect(authorizationService.testPolicy(mockPolicyString, mockInput)).rejects.toThrow(PolicyEvaluationError);
            await expect(authorizationService.testPolicy(mockPolicyString, mockInput)).rejects.toThrow("Failed to test policy: OPA test evaluation failed");
            expect(mockLogger.error).toHaveBeenCalledWith(
                "Error during policy test evaluation",
                expect.objectContaining({ error: evaluationError })
            );
        });

        it("should re-throw ValidationError if caught during testPolicy", async () => {
            mockRegoEngine.evaluate.mockImplementation(() => {
                throw new ValidationError("Internal test validation issue");
            });
            await expect(authorizationService.testPolicy(mockPolicyString, mockInput)).rejects.toThrow(ValidationError);
            expect(mockLogger.error).toHaveBeenCalled();
        });
    });
});
