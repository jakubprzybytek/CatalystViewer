export interface AgentTool {
    name: string;
    description: string;
    inputSchema: Record<string, unknown>; // JSON Schema object
    execute(input: unknown): Promise<string>;
}

export type AgentEvent =
    | { type: 'tool_use'; iteration: number; toolName: string; input: unknown }
    | { type: 'tool_result'; iteration: number; toolName: string; toolUseId: string; result: string; isError: boolean }
    | { type: 'end_turn'; iteration: number; text: string }
    | { type: 'usage'; inputTokens: number; outputTokens: number; totalTokens: number };

export class LoopLimitExceeded extends Error {
    constructor(maxIterations: number) {
        super(`Agent loop exceeded maximum iterations (${maxIterations})`);
        this.name = 'LoopLimitExceeded';
    }
}

export class UnexpectedStopReason extends Error {
    constructor(stopReason: string | undefined) {
        super(`Unexpected stop reason from model: ${stopReason ?? 'none'}`);
        this.name = 'UnexpectedStopReason';
    }
}
