export interface RegoEvaluationResult {
    allow: boolean;
    reason?: string;
}

export interface IRegoEngine {
    evaluate(
        policy: string,
        input: unknown,
        query?: string
    ): Promise<RegoEvaluationResult>;
}