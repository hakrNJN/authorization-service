
import "reflect-metadata";
import request from "supertest";
import express from "express";
import { Server } from 'http';
import { container } from "../../src/container";
import { TYPES } from "../../src/shared/constants/types";
import { IAuthorizationService } from "../../src/application/interfaces/IAuthorizationService";
import { ILogger } from "../../src/application/interfaces/ILogger";
import { AuthorizationDecision } from "../../src/domain/entities/AuthorizationDecision";
import { ValidationError } from "../../src/shared/errors/BaseError";
import { PolicyEvaluationError } from "../../src/domain/exceptions/AuthorizationError";
import { AuthorizationController } from "../../src/api/controllers/authorization.controller";
import { validationMiddleware } from "../../src/api/middlewares/validation.middleware";
import { AuthorizeSchema } from "../../src/api/dtos/authorize.dto";
import { TestPolicyRequestSchema } from "../../src/api/dtos/test-policy.dto";

// Mock the dependencies
const mockAuthorizationService: jest.Mocked<IAuthorizationService> = {
    checkPermission: jest.fn(),
    testPolicy: jest.fn(),
};

const mockLogger: jest.Mocked<ILogger> = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
};

describe("Authorization Routes", () => {
    let app: express.Application;
    let server: Server; // Declare server variable

    beforeAll((done) => {
        // Reset the container to ensure a clean state for each test run
        container.reset();

        // Register our mocks with the tsyringe container
        container.registerInstance(TYPES.AuthorizationService, mockAuthorizationService);
        container.registerInstance(TYPES.Logger, mockLogger);

        // Resolve the controller after mocks are registered
        const authorizationController = container.resolve(AuthorizationController);

        app = express();
        app.use(express.json()); // Enable JSON body parsing

        // Manually set up routes using the resolved controller and mocked middleware
        const router = express.Router();

        router.post(
            '/authorize',
            validationMiddleware(AuthorizeSchema, mockLogger), // Use mockLogger here
            authorizationController.checkPermission
        );

        router.post(
            '/test-policy',
            validationMiddleware(TestPolicyRequestSchema, mockLogger), // Use mockLogger here
            authorizationController.testPolicy
        );

        app.use(router);

        // Add a generic error handler to catch errors passed by next(error)
        app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
            mockLogger.error("Caught error in test error handler:", err);
            const statusCode = err.statusCode || 500;
            res.status(statusCode).json({ message: err.message || "Internal Server Error" });
        });

        // Start the server on a random available port
        server = app.listen(0, () => {
            done();
        });
    });

    afterAll((done) => {
        server.close(done);
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("POST /authorize", () => {
        const validAuthRequest = {
            subject: { id: "user123", roles: ["user"] },
            action: "read",
            resource: { type: "document", id: "doc1" },
            context: { ipAddress: "127.0.0.1" },
        };

        it("should return 200 OK with allowed: true for a successful authorization", async () => {
            const mockDecision: AuthorizationDecision = { allowed: true, reason: "Policy allowed" };
            mockAuthorizationService.checkPermission.mockResolvedValue(mockDecision);

            const res = await request(app)
                .post("/authorize")
                .send(validAuthRequest);

            expect(res.statusCode).toEqual(200);
            expect(res.body).toEqual(mockDecision);
            expect(mockAuthorizationService.checkPermission).toHaveBeenCalledWith(validAuthRequest);
        });

        it("should return 200 OK with allowed: false for a denied authorization", async () => {
            const mockDecision: AuthorizationDecision = { allowed: false, reason: "Policy denied" };
            mockAuthorizationService.checkPermission.mockResolvedValue(mockDecision);

            const res = await request(app)
                .post("/authorize")
                .send(validAuthRequest);

            expect(res.statusCode).toEqual(200);
            expect(res.body).toEqual(mockDecision);
            expect(mockAuthorizationService.checkPermission).toHaveBeenCalledWith(validAuthRequest);
        });

        it("should return 400 Bad Request for invalid input", async () => {
            const invalidAuthRequest = { ...validAuthRequest, action: undefined }; // Missing action

            const res = await request(app)
                .post("/authorize")
                .send(invalidAuthRequest);

            expect(res.statusCode).toEqual(400);
            expect(res.body).toHaveProperty("message", "Input validation failed");
            expect(mockAuthorizationService.checkPermission).not.toHaveBeenCalled();
        });

        it("should return 500 Internal Server Error if authorization service throws an unexpected error", async () => {
            mockAuthorizationService.checkPermission.mockRejectedValue(new Error("Service internal error"));

            const res = await request(app)
                .post("/authorize")
                .send(validAuthRequest);

            expect(res.statusCode).toEqual(500);
            expect(res.body).toHaveProperty("message", "Service internal error");
            expect(mockLogger.error).toHaveBeenCalled();
        });

        it("should return 400 Bad Request if authorization service throws ValidationError", async () => {
            mockAuthorizationService.checkPermission.mockRejectedValue(new ValidationError("Invalid subject"));

            const res = await request(app)
                .post("/authorize")
                .send(validAuthRequest);

            expect(res.statusCode).toEqual(400);
            expect(res.body).toHaveProperty("message", "Invalid subject");
            expect(mockLogger.error).toHaveBeenCalled();
        });

        it("should return 500 Internal Server Error if authorization service throws PolicyEvaluationError", async () => {
            mockAuthorizationService.checkPermission.mockRejectedValue(new PolicyEvaluationError("Policy engine failed"));

            const res = await request(app)
                .post("/authorize")
                .send(validAuthRequest);

            expect(res.statusCode).toEqual(500);
            expect(res.body).toHaveProperty("message", "Policy engine failed");
            expect(mockLogger.error).toHaveBeenCalled();
        });
    });

    describe("POST /test-policy", () => {
        const validTestPolicyRequest = {
            policy: `package authz
allow = true`,
            input: { user: "test", action: "view" },
            query: "data.authz.allow",
        };

        it("should return 200 OK with the policy evaluation result", async () => {
            const mockResult = { allow: true, decision_id: "test-id" };
            mockAuthorizationService.testPolicy.mockResolvedValue(mockResult);

            const res = await request(app)
                .post("/test-policy")
                .send(validTestPolicyRequest);

            expect(res.statusCode).toEqual(200);
            expect(res.body).toEqual(mockResult);
            expect(mockAuthorizationService.testPolicy).toHaveBeenCalledWith(
                validTestPolicyRequest.policy,
                validTestPolicyRequest.input,
                validTestPolicyRequest.query
            );
        });

        it("should return 400 Bad Request for invalid input", async () => {
            const invalidTestPolicyRequest = { ...validTestPolicyRequest, policy: undefined }; // Missing policy

            const res = await request(app)
                .post("/test-policy")
                .send(invalidTestPolicyRequest);

            expect(res.statusCode).toEqual(400);
            expect(res.body).toHaveProperty("message", "Input validation failed");
            expect(mockAuthorizationService.testPolicy).not.toHaveBeenCalled();
        });

        it("should return 500 Internal Server Error if testPolicy service throws an unexpected error", async () => {
            mockAuthorizationService.testPolicy.mockRejectedValue(new Error("Test service internal error"));

            const res = await request(app)
                .post("/test-policy")
                .send(validTestPolicyRequest);

            expect(res.statusCode).toEqual(500);
            expect(res.body).toHaveProperty("message", "Test service internal error");
            expect(mockLogger.error).toHaveBeenCalled();
        });

        it("should return 400 Bad Request if testPolicy service throws ValidationError", async () => {
            mockAuthorizationService.testPolicy.mockRejectedValue(new ValidationError("Empty policy string"));

            const res = await request(app)
                .post("/test-policy")
                .send(validTestPolicyRequest);

            expect(res.statusCode).toEqual(400);
            expect(res.body).toHaveProperty("message", "Empty policy string");
            expect(mockLogger.error).toHaveBeenCalled();
        });

        it("should return 500 Internal Server Error if testPolicy service throws PolicyEvaluationError", async () => {
            mockAuthorizationService.testPolicy.mockRejectedValue(new PolicyEvaluationError("Test policy engine failed"));

            const res = await request(app)
                .post("/test-policy")
                .send(validTestPolicyRequest);

            expect(res.statusCode).toEqual(500);
            expect(res.body).toHaveProperty("message", "Test policy engine failed");
            expect(mockLogger.error).toHaveBeenCalled();
        });
    });
});
