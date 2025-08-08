import { IRegoEngine, RegoEvaluationResult } from "../../application/interfaces/IRegoEngine";
import { ILogger } from "../../application/interfaces/ILogger";
import { TYPES } from "../../shared/constants/types";
import { inject, injectable } from "tsyringe";
import { spawn } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';

@injectable()
export class OpaVsixEngine implements IRegoEngine {

    constructor(
        @inject(TYPES.Logger) private logger: ILogger
    ) { }

    public async evaluate(policy: string, input: unknown, query: string = 'data.authz.allow'): Promise<RegoEvaluationResult> {
        const tempDir = await fs.mkdtemp(path.join(require('os').tmpdir(), 'opa-'));
        const policyFilePath = path.join(tempDir, 'policy.rego');
        const inputFilePath = path.join(tempDir, 'input.json');

        try {
            await fs.writeFile(policyFilePath, policy);
            await fs.writeFile(inputFilePath, JSON.stringify({ input }));

            const result = await this.executeOpa(policyFilePath, inputFilePath, query);

            return result;
        } finally {
            await fs.rm(tempDir, { recursive: true, force: true });
        }
    }

    private executeOpa(policyFilePath: string, inputFilePath: string, query: string): Promise<RegoEvaluationResult> {
        return new Promise((resolve, reject) => {
            const opa = spawn('opa', ['eval', '--data', policyFilePath, '--input', inputFilePath, query, '--format', 'json']);

            let stdout = '';
            let stderr = '';

            opa.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            opa.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            opa.on('close', (code) => {
                if (code !== 0) {
                    this.logger.error(`OPA process exited with code ${code}: ${stderr}`);
                    return reject(new Error(`OPA process exited with code ${code}`));
                }

                try {
                    const parsedOutput = JSON.parse(stdout);
                    const result = parsedOutput.result?.[0]?.expressions?.[0]?.value;
                    resolve({ allow: result === true });
                } catch (error) {
                    this.logger.error(`Failed to parse OPA output: ${stdout}`);
                    reject(new Error('Failed to parse OPA output.'));
                }
            });
        });
    }
}