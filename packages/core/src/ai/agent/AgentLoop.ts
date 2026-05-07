import {
    BedrockRuntimeClient,
    ConverseCommand,
    type Message,
    type ToolResultBlock,
} from '@aws-sdk/client-bedrock-runtime';
import { type AgentTool, type AgentEvent, LoopLimitExceeded, UnexpectedStopReason } from './Tool';

const MAX_ITERATIONS = 10;

export class AgentLoop {
    private readonly bedrockClient: BedrockRuntimeClient;
    private readonly modelId: string;
    private readonly tools: AgentTool[];

    constructor(bedrockClient: BedrockRuntimeClient, modelId: string, tools: AgentTool[]) {
        this.bedrockClient = bedrockClient;
        this.modelId = modelId;
        this.tools = tools;
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

        while (iteration < MAX_ITERATIONS) {
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

                    onEvent?.({ type: 'tool_result', iteration, toolUseId: toolUseId ?? '', result: resultText, isError });

                    toolResults.push({
                        toolUseId: toolUseId ?? '',
                        content: [{ text: resultText }],
                        status: isError ? 'error' : 'success',
                    });
                }

                // Append tool results as a user turn.
                // ContentBlock union also includes $unknown, so we cast here.
                messages.push({
                    role: 'user',
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    content: toolResults.map((r) => ({ toolResult: r })) as any,
                });

                continue;
            }

            throw new UnexpectedStopReason(stopReason);
        }

        throw new LoopLimitExceeded(MAX_ITERATIONS);
    }
}
