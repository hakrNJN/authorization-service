# Authorization Service

This service is the central component for Policy-Based Access Control (PBAC) within the system. It evaluates authorization requests against defined policies, leveraging Open Policy Agent (OPA) for policy enforcement.

## Table of Contents
- [Folder Structure](#folder-structure)
- [Tech Stack](#tech-stack)
- [Design Patterns and Principles](#design-patterns-and-principles)
- [Purpose and Key Functionalities](#purpose-and-key-functionalities)
- [API Endpoints](#api-endpoints)
- [Dependencies](#dependencies)
- [Environment Variables](#environment-variables)
- [Local Setup Instructions](#local-setup-instructions)

## Folder Structure
```
authorization-service/
├── src/
│   ├── api/                  # API layer (controllers, DTOs, middlewares, routes)
│   │   ├── controllers/      # Request handling logic
│   │   ├── dtos/             # Data Transfer Objects for request/response validation
│   │   ├── middlewares/      # Express middleware (e.g., API key authentication)
│   │   └── routes/           # Defines API endpoints and maps to controllers
│   ├── application/          # Application layer (orchestrates domain logic, use cases)
│   ├── domain/               # Domain layer (core business logic, policy evaluation)
│   ├── infrastructure/       # Infrastructure layer (OPA integration, external services, logging)
│   ├── shared/               # Shared utilities, types, constants
│   ├── types/                # Custom TypeScript type definitions
│   ├── app.ts                # Express application setup
│   ├── container.ts          # Dependency Injection container setup (tsyringe)
│   └── main.ts               # Application entry point
├── tests/                    # Unit, Integration, and E2E tests
├── .env.example              # Example environment variables
├── Dockerfile                # Docker build instructions
├── package.json              # Project dependencies and scripts
├── pnpm-lock.yaml            # pnpm lock file
└── README.md                 # This documentation
```

## Tech Stack
- **Language:** TypeScript
- **Runtime:** Node.js
- **Web Framework:** Express.js
- **Package Manager:** pnpm
- **Policy Enforcement:** Open Policy Agent (OPA) via `@open-policy-agent/opa-wasm`
- **Authorization Library:** CASL (`@casl/ability`)
- **HTTP Client:** Axios
- **Dependency Injection:** tsyringe
- **Validation:** Zod
- **Logging:** Winston (with CloudWatch and Elasticsearch transports)
- **Observability:** OpenTelemetry (for tracing and metrics), Prometheus (via `prom-client`)
- **Resilience:** Opossum (Circuit Breaker)

## Design Patterns and Principles
- **Layered Architecture:** The service is structured into distinct layers (API, Application, Domain, Infrastructure) to promote separation of concerns and maintainability.
- **Dependency Injection:** Utilizes `tsyringe` to manage dependencies, making the codebase more modular and testable.
- **Circuit Breaker:** Implements the Circuit Breaker pattern using `opossum` to prevent cascading failures and improve system resilience.
- **Observability:** Designed with observability in mind, integrating OpenTelemetry for distributed tracing and `prom-client` for Prometheus metrics.
- **Policy-Based Access Control:** Central to the service, externalizing authorization logic to OPA for flexible and dynamic policy management.

## Purpose and Key Functionalities
**Purpose:** To provide a robust and flexible policy-based access control mechanism for the entire system, ensuring that only authorized actions are permitted.

**Key Functionalities:**
- **Authorization Evaluation:** Receives authorization requests and evaluates them against configured policies to determine access.
- **Policy Testing:** Allows for testing of policies with specific input contexts to verify their behavior.
- **Policy Cache Invalidation:** Provides an endpoint to invalidate the policy cache, ensuring that policy updates are reflected promptly.
- **System Monitoring:** Offers health check, server information, and Prometheus metrics endpoints for operational visibility.

## API Endpoints
All endpoints are typically prefixed with `/api/authorization`.

- `POST /authorize`: Evaluates an authorization request based on the provided context and returns an authorization decision.
- `POST /test-policy`: Allows for testing a policy with a given input to see the expected output.

**Admin/Internal Endpoints (typically prefixed with `/api/policy-cache` and require API Key authentication):**
- `POST /invalidate-cache`: Invalidates the service's policy cache, forcing it to fetch the latest policies.

**System Endpoints (typically not requiring authentication):**
- `GET /health`: Returns the health status of the service.
- `GET /server-info`: Provides general information about the server and service.
- `GET /metrics`: Exposes Prometheus-compatible metrics for monitoring.

## Dependencies
Key dependencies include:
- `@casl/ability`: For defining and checking abilities.
- `@open-policy-agent/opa-wasm`: For integrating with OPA.
- `express`: Web framework.
- `axios`: HTTP client for external calls (e.g., to OPA).
- `tsyringe`: Dependency injection container.
- `zod`: For data validation.
- `winston`: Logging library.
- `@opentelemetry/*`: For distributed tracing and metrics.
- `prom-client`: For Prometheus metrics.
- `opossum`: For circuit breaker implementation.
- `dotenv`: For environment variable management.

## Environment Variables
Configuration is managed via environment variables. A `.env.example` file is provided as a template.

| Variable                  | Description                                          | Example Value       |
|---------------------------|------------------------------------------------------|---------------------|
| `NODE_ENV`                | Node.js environment (e.g., development, production). | `development`       |
| `PORT`                    | Port on which the service will listen.               | `3002`              |
| `LOG_LEVEL`               | Minimum logging level (e.g., info, debug, error).    | `info`              |
| `AWS_REGION`              | AWS region (if interacting with AWS services).       | `us-east-1`         |
| `COGNITO_USER_POOL_ID`    | AWS Cognito User Pool ID (for admin guard).          | `your-user-pool-id` |
| `COGNITO_CLIENT_ID`       | AWS Cognito Client ID (for admin guard).             | `your-client-id`    |
| `COGNITO_ISSUER`          | Cognito Issuer URL for JWT validation.               | `https://cognito-idp.{region}.amazonaws.com/{userPoolId}` |
| `COGNITO_JWKS_URI`        | Cognito JWKS URI for JWT validation.                 | `https://cognito-idp.{region}.amazonaws.com/{userPoolId}/.well-known/jwks.json` |
| `POLICY_CACHE_API_KEY`    | API Key for invalidating the policy cache.           | `your-super-secret-api-key` |

## Local Setup Instructions

To set up and run the Authorization Service locally, follow these steps:

1.  **Prerequisites:**
    *   Node.js (v20 or higher recommended)
    *   pnpm (v8 or higher recommended)
    *   Docker and Docker Compose

2.  **Clone the Repository:**
    ```bash
    git clone <repository-url>
    cd authorization-service
    ```

3.  **Install Dependencies:**
    ```bash
    pnpm install
    ```

4.  **Environment Configuration:**
    Create a `.env` file in the root of the `authorization-service` directory by copying `.env.example` and filling in the appropriate values.
    ```bash
    cp .env.example .env
    # Edit .env with your specific configuration
    ```

5.  **Run with Docker Compose (Recommended for local development):**
    The `docker-compose.yml` in the project root orchestrates all services, including OPA and Redis.
    Navigate to the project root (`E:\NodeJS\PBAC_Auth`) and run:
    ```bash
    docker compose up -d opa redis
    ```
    Then, from the `authorization-service` directory, start the service in development mode:
    ```bash
    pnpm run dev
    ```

6.  **Build and Run (Production-like):**
    ```bash
    pnpm run build
    pnpm run start
    ```

7.  **Running Tests:**
    ```bash
    pnpm test
    ```