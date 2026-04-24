import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

export const INDUSTRIES = [
  'Banking',
  'Real Estate',
  'Energy & Utilities',
  'Retail & Commerce',
  'Manufacturing',
  'Healthcare & Pharmaceuticals',
  'Technology & IT',
  'Transportation & Logistics',
  'Media & Entertainment',
  'Telecommunications',
  'Food & Beverage',
  'Automotive',
  'Agriculture',
  'Mining & Natural Resources',
  'Construction',
  'Finance & Insurance',
  'Other',
] as const;

export type Industry = typeof INDUSTRIES[number];

const MODEL_ID = 'anthropic.claude-3-haiku-20240307-v1:0';

export class IssuerClassifier {
  private readonly client: BedrockRuntimeClient;

  constructor() {
    this.client = new BedrockRuntimeClient({});
  }

  async classifyIndustry(issuerName: string): Promise<{ industry: Industry; modelId: string }> {
    const prompt = `You are classifying Polish corporate bond issuers listed on the Catalyst bond market by their primary industry.

Issuer name: "${issuerName}"

Choose exactly one industry from this list:
${INDUSTRIES.join('\n')}

Respond with only the industry name from the list above, nothing else.`;

    const body = JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 30,
      messages: [{ role: 'user', content: prompt }]
    });

    const command = new InvokeModelCommand({
      modelId: MODEL_ID,
      contentType: 'application/json',
      accept: 'application/json',
      body: new TextEncoder().encode(body),
    });

    const response = await this.client.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    const rawText: string = responseBody.content[0].text.trim();

    const matched = INDUSTRIES.find(industry =>
      industry.toLowerCase() === rawText.toLowerCase()
    );

    console.log(`IssuerClassifier: '${issuerName}' -> '${rawText}' (matched: ${matched ?? 'Other'})`);

    return {
      industry: matched ?? 'Other',
      modelId: MODEL_ID,
    };
  }
}
