import { type AgentTool } from '../agent/Tool';
import { type TavilyClient } from './tavily/TavilyClient';

type WebSearchInput = {
    query: string;
};

function isWebSearchInput(value: unknown): value is WebSearchInput {
    return (
        typeof value === 'object' &&
        value !== null &&
        'query' in value &&
        typeof (value as Record<string, unknown>).query === 'string'
    );
}

export class WebSearchTool implements AgentTool {
    readonly name = 'web_search';
    readonly description = 'Search the web for information. Returns a list of relevant results with URL, title, and content snippet.';
    readonly inputSchema: Record<string, unknown> = {
        type: 'object',
        properties: {
            query: {
                type: 'string',
                description: 'The search query',
            },
        },
        required: ['query'],
    };

    private readonly tavilyClient: TavilyClient;

    constructor(tavilyClient: TavilyClient) {
        this.tavilyClient = tavilyClient;
    }

    async execute(input: unknown): Promise<string> {
        if (!isWebSearchInput(input)) {
            throw new Error('Invalid input: expected { query: string }');
        }
        const results = await this.tavilyClient.search(input.query, 5);
        return JSON.stringify(results);
    }
}
