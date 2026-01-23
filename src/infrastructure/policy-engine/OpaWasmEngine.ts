import { IRegoEngine, RegoEvaluationResult } from "application/interfaces/IRegoEngine";
import { ILogger } from "application/interfaces/ILogger";
import { TYPES } from "shared/constants/types";
import { inject, injectable } from "tsyringe";
import { OpaRuntime } from '@open-policy-agent/opa-wasm';

// TODO: For production, consider how Wasm policy bundles are distributed and loaded.
// This implementation assumes the 'policy' argument to evaluate is a base64 encoded Wasm module.
// A more robust solution might involve fetching Wasm bundles from a policy store.
// Also, ensure that the policies being evaluated are thoroughly tested and linted.

@injectable()
export class OpaWasmEngine implements IRegoEngine {
    private opaRuntime: OpaRuntime | null = null;

    constructor(
        @inject(TYPES.Logger) private logger: ILogger
    ) { }

    private currentWasmHash: string | null = null;

    private async initializeOpaRuntime(wasmBase64: string): Promise<void> {
        if (this.opaRuntime) {
            // this.opaRuntime.free(); // Free existing runtime if re-initializing - NOTE: Check if .free() exists on the instance or is needed
        }
        try {
            const wasmBytes = Buffer.from(wasmBase64, 'base64');
            this.opaRuntime = await OpaRuntime.new(wasmBytes);
            this.currentWasmHash = wasmBase64; // Store "hash" (using the string itself as it's passed by value)
            this.logger.info('OPA Wasm runtime initialized successfully.');
        } catch (error: any) {
            this.logger.error(`Failed to initialize OPA Wasm runtime: ${error.message}`, error);
            throw new Error('Failed to initialize OPA Wasm engine.');
        }
    }

    public async evaluate(policy: string, input: unknown, query: string = 'data.authz.allow'): Promise<RegoEvaluationResult> {
        // 'policy' argument is expected to be the base64 encoded Wasm module
        // Check if we need to (re)initialize
        if (!this.opaRuntime || this.currentWasmHash !== policy) {
            this.logger.info('Policy changed or not initialized. Loading new WASM bundle.');
            await this.initializeOpaRuntime(policy);
        }

        try {
            const stringInput = JSON.stringify(input);
            const result = this.opaRuntime?.evaluate(stringInput, query);

            if (!result || result.length === 0) {
                this.logger.warn(`OPA Wasm evaluation returned no result for query: ${query}`);
                return { allow: false }; // Default to deny if no result
            }

            // Assuming the result is an array and we care about the first element's value
            const allow = result[0]?.result === true; // Adjust based on actual policy output

            this.logger.debug(`OPA Wasm evaluation result: ${JSON.stringify(result)}`);
            return { allow: allow };
        } catch (error: any) {
            this.logger.error(`Error during OPA Wasm evaluation: ${error.message}`, error);
            throw new Error(`OPA Wasm evaluation failed: ${error.message}`);
        }
    }
}