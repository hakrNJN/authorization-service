import { inject, injectable } from 'tsyringe';
import { IRegoEngine, RegoEvaluationResult } from 'application/interfaces/IRegoEngine';
import { IConfigService } from 'application/interfaces/IConfigService';
import { ILogger } from 'application/interfaces/ILogger';
import { TYPES } from 'shared/constants/types';
import axios from 'axios';

// TODO: Ensure that the policies being evaluated by the external OPA instance are thoroughly tested and linted.
// This typically involves integrating OPA's testing and linting tools into the policy development pipeline.

@injectable()
export class OpaExternalEngine implements IRegoEngine {
    private readonly opaUrl: string;

    constructor(
        @inject(TYPES.ConfigService) private configService: IConfigService,
        @inject(TYPES.Logger) private logger: ILogger
    ) {
        this.opaUrl = this.configService.getOrThrow('OPA_URL');
        // TODO: Implement connection management (e.g., connection pooling, health checks for OPA endpoint).
    }

    public async evaluate(policy: string, input: unknown, query: string = 'data.authz.allow'): Promise<RegoEvaluationResult> {
        try {
            // OPA's /v1/data endpoint expects a JSON object with 'input' and optionally 'query'
            const requestBody = {
                input: input,
                query: query,
                // Policy can be sent if OPA is configured to accept it via API, but typically
                // external OPA instances load policies from bundles or other sources.
                // For simplicity, we assume policies are pre-loaded in the external OPA.
                // If policies need to be sent per request, the OPA endpoint and requestBody would change.
            };

            const response = await axios.post(`${this.opaUrl}/v1/data`, requestBody);

            // OPA's /v1/data endpoint returns a result object, typically with a 'result' field
            // The structure depends on the query. For 'data.authz.allow', it's usually a boolean.
            const result = response.data.result;

            // Assuming the query returns a boolean directly or within a specific path
            // Adjust this based on your actual OPA policy output structure
            const allow = typeof result === 'boolean' ? result : (result?.allow === true);

            return { allow: allow };
        } catch (error: any) {
            this.logger.error(`Error evaluating policy with external OPA at ${this.opaUrl}: ${error.message}`, error);
            // TODO: Implement robust error handling for network issues, OPA service unavailability, etc.
            // Consider retry mechanisms, circuit breakers, and more specific error types.
            throw new Error(`Failed to evaluate policy with external OPA: ${error.message}`);
        }
    }
}
