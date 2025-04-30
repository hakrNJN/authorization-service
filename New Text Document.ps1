# Create root directory (replace 'authorization-service' if needed)
mkdir authorization-service
cd authorization-service

# Create main source and test directories
mkdir src, tests

# Create subdirectories within src
mkdir src\api, src\application, src\domain, src\infrastructure, src\shared
mkdir tests\unit, tests\integration, tests\e2e, tests\mocks

# Create API layer subdirectories
mkdir src\api\controllers, src\api\dtos, src\api\middlewares, src\api\routes

# Create Application layer subdirectories
mkdir src\application\services, src\application\interfaces, src\application\usecases

# Create Domain layer subdirectories
mkdir src\domain\entities, src\domain\exceptions, src\domain\value-objects, src\domain\policies

# Create Infrastructure layer subdirectories
mkdir src\infrastructure\adapters, src\infrastructure\config, src\infrastructure\logging, src\infrastructure\persistence, src\infrastructure\resilience, src\infrastructure\policy-engine
# Add sub-dirs for specific adapters/persistence if known (e.g., src\infrastructure\adapters\opa)

# Create Shared layer subdirectories
mkdir src\shared\constants, src\shared\errors, src\shared\types, src\shared\utils

# Create root level config directory
mkdir config

# Create basic files (optional, can be done via IDE)
# New-Item src\main.ts, src\app.ts, src\container.ts
# New-Item .env.example, .gitignore, package.json, tsconfig.json, jest.config.js, .eslintrc.js, .prettierrc.js, README.md

Write-Host "Authorization Service folder structure created."
