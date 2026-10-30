import { afterEach, describe, expect, it, vi } from 'vitest';
import { runAnalysis, runClassification } from './IssuerAI';
import { STUB_MODEL_ID, stubAnalysis, stubClassification } from './IssuerStubs';

describe('IssuerAI', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('answers with the stubs when AI_MODE=stub', async () => {
    vi.stubEnv('AI_MODE', 'stub');
    expect(await runClassification('Atal S.A.')).toEqual({ ...stubClassification('Atal S.A.'), modelId: STUB_MODEL_ID });
    expect((await runAnalysis('Atal S.A.')).scorecard).toEqual(stubAnalysis('Atal S.A.').scorecard);
  });

  it('fails before calling Bedrock when the Tavily key is missing', async () => {
    vi.stubEnv('AI_MODE', '');
    vi.stubEnv('TAVILY_API_KEY', '');
    await expect(runClassification('Atal S.A.')).rejects.toThrow('TAVILY_API_KEY');
    await expect(runAnalysis('Atal S.A.')).rejects.toThrow('TAVILY_API_KEY');
  });
});
