export type TavilySearchResult = {
    url: string;
    title: string;
    content: string;
};

type TavilySearchResponse = {
    results: Array<{
        url: string;
        title: string;
        content: string;
    }>;
};

export class TavilyClient {
    private readonly apiKey: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    async search(query: string, maxResults = 5): Promise<TavilySearchResult[]> {
        const response = await fetch('https://api.tavily.com/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                api_key: this.apiKey,
                query,
                max_results: maxResults,
                search_depth: 'basic',
            }),
        });

        if (!response.ok) {
            const body = await response.text().catch(() => '');
            throw new Error(`Tavily API error ${response.status}: ${body}`);
        }

        const data = await response.json() as TavilySearchResponse;

        return data.results.map(({ url, title, content }) => ({ url, title, content }));
    }
}
