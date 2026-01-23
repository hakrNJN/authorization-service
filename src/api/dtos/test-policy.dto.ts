import { z } from 'zod';

export const TestPolicyRequestSchema = z.object({
  body: z.object({
    policy: z.string().min(1, 'Policy string cannot be empty'),
    input: z.any().optional(), // Input data for policy evaluation
    query: z.string().optional(), // Rego query, defaults to data.authz.allow
  }),
});

export type TestPolicyRequestDto = z.infer<typeof TestPolicyRequestSchema>['body'];

export const TestPolicyResponseSchema = z.any(); // The response can be any JSON structure from OPA

export type TestPolicyResponseDto = z.infer<typeof TestPolicyResponseSchema>;
