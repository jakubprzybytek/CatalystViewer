import {
    BedrockRuntimeClient,
    ConverseCommand,
    type Message,
    type ToolResultBlock,
} from '@aws-sdk/client-bedrock-runtime';
import { type AgentTool, type AgentEvent, LoopLimitExceeded, UnexpectedStopReason } from './Tool';

const DEFAULT_MAX_ITERATIONS = 10;

export class AgentLoop {
    private readonly bedrockClient: BedrockRuntimeClient;
    private readonly modelId: string;
    private readonly tools: AgentTool[];
    private readonly maxIterations: number;

    constructor(bedrockClient: BedrockRuntimeClient, modelId: string, tools: AgentTool[], maxIterations = DEFAULT_MAX_ITERATIONS) {
        this.bedrockClient = bedrockClient;
        this.modelId = modelId;
        this.tools = tools;
        this.maxIterations = maxIterations;
    }

    async run(taskPrompt: string, onEvent?: (event: AgentEvent) => void): Promise<string> {
        const messages: Message[] = [
            { role: 'user', content: [{ text: taskPrompt }] },
        ];

        // Build tool specs — cast required because the SDK's Tool union includes
        // an `$unknown` member that cannot be constructed directly.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const toolConfig: any = {
            tools: this.tools.map((tool) => ({
                toolSpec: {
                    name: tool.name,
                    description: tool.description,
                    inputSchema: { json: tool.inputSchema },
                },
            })),
        };

        let iteration = 0;

        while (iteration < this.maxIterations) {
            iteration++;

            const response = await this.bedrockClient.send(new ConverseCommand({
                modelId: this.modelId,
                messages,
                toolConfig,
            }));

            const stopReason = response.stopReason;
            const responseMessage = response.output?.message;

            if (!responseMessage) {
                throw new UnexpectedStopReason(stopReason);
            }

            if (stopReason === 'end_turn') {
                const text = responseMessage.content
                    ?.find((block) => 'text' in block && typeof block.text === 'string')
                    ?.text ?? '';

                onEvent?.({ type: 'end_turn', iteration, text });
                return text;
            }

            if (stopReason === 'tool_use') {
                // Append the assistant's turn to history
                messages.push({ role: 'assistant', content: responseMessage.content ?? [] });

                // Execute all tool use blocks sequentially and collect ToolResultBlock objects
                const toolResults: ToolResultBlock[] = [];

                for (const block of responseMessage.content ?? []) {
                    if (!('toolUse' in block) || !block.toolUse) continue;

                    const { toolUseId, name, input } = block.toolUse;

                    onEvent?.({ type: 'tool_use', iteration, toolName: name ?? '', input: input ?? {} });

                    const tool = this.tools.find((t) => t.name === name);
                    let resultText: string;
                    let isError = false;

                    if (!tool) {
                        resultText = `Unknown tool: ${name}`;
                        isError = true;
                    } else {
                        try {
                            resultText = await tool.execute(input ?? {});
                        } catch (error) {
                            resultText = error instanceof Error ? error.message : String(error);
                            isError = true;
                        }
                    }

                    onEvent?.({ type: 'tool_result', iteration, toolName: name ?? '', toolUseId: toolUseId ?? '', result: resultText, isError });

                    toolResults.push({
                        toolUseId: toolUseId ?? '',
                        content: [{ text: resultText }],
                        status: isError ? 'error' : 'success',
                    });
                }

                // Append tool results as a user turn.
                // ContentBlock union also includes $unknown, so we cast here.
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const toolResultContent = toolResults.map((r) => ({ toolResult: r })) as any;

                // If this was the last allowed iteration, force a final answer by
                // appending a plain user message and calling without toolConfig.
                if (iteration >= this.maxIterations) {
                    messages.push({ role: 'user', content: toolResultContent });
                    messages.push({
                        role: 'user',
                        content: [{ text: 'You have reached the search limit. Stop searching and produce the final answer now using only the data you have already gathered. Do not call any more tools.' }],
                    });
                    const finalResponse = await this.bedrockClient.send(new ConverseCommand({
                        modelId: this.modelId,
                        messages,
                        toolConfig,  // must be present whenever history contains toolUse/toolResult blocks
                    }));
                    const text = finalResponse.output?.message?.content
                        ?.find((block) => 'text' in block && typeof block.text === 'string')
                        ?.text ?? '';
                    onEvent?.({ type: 'end_turn', iteration: iteration + 1, text });
                    return text;
                }

                messages.push({ role: 'user', content: toolResultContent });

                continue;
            }

            throw new UnexpectedStopReason(stopReason);
        }

        throw new LoopLimitExceeded(this.maxIterations);
    }
}
