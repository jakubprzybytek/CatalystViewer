// Entry point to the two AI features (issuer classification, fundamental analysis), shared by the
// Lambdas and the local CLI (cli.ts), so a local run executes exactly the code the deployed app runs.
// AI_MODE=stub swaps in the fixed answers from IssuerStubs.ts; otherwise Bedrock and Tavily are called.
import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';
import type { AgentEvent } from '../agent/Tool';
import { TavilyClient } from '../tools/tavily/TavilyClient';
import { classifyIssuer, MODEL_ID as CLASSIFICATION_MODEL_ID, type ClassificationResponse } from './IssuerClassification';
import { analyzeIssuer, type IssuerAnalysisResult } from './IssuerAnalysis';
import { aiStubbed, STUB_MODEL_ID, stubAnalysis, stubClassification } from './IssuerStubs';

// The app's region; Lambdas get AWS_REGION from the runtime, a local shell may not have it.
const region = () => process.env.AWS_REGION ?? 'eu-west-1';

// Created on first use and reused, like module-level clients in a Lambda.
let classificationBedrock: BedrockRuntimeClient | undefined;
let analysisBedrock: BedrockRuntimeClient | undefined;

function tavilyClient(): TavilyClient {
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) {
        throw new Error('TAVILY_API_KEY environment variable is not set');
    }
    return new TavilyClient(apiKey);
}

export type ClassificationRun = ClassificationResponse & { modelId: string };

export async function runClassification(issuerName: string, onEvent?: (event: AgentEvent) => void): Promise<ClassificationRun> {
    if (aiStubbed()) {
        return { ...stubClassification(issuerName), modelId: STUB_MODEL_ID };
    }
    classificationBedrock ??= new BedrockRuntimeClient({ region: region(), maxAttempts: 1 });
    const classification = await classifyIssuer(classificationBedrock, tavilyClient(), issuerName, onEvent);
    return { ...classification, modelId: CLASSIFICATION_MODEL_ID };
}

export type AnalysisOptions = {
    modelId?: string; // default: DEFAULT_MODEL_ALIAS in models.ts
    onEvent?: (event: AgentEvent) => void;
};

export async function runAnalysis(issuerName: string, options: AnalysisOptions = {}): Promise<IssuerAnalysisResult> {
    if (aiStubbed()) {
        return stubAnalysis(issuerName);
    }
    analysisBedrock ??= new BedrockRuntimeClient({ region: region() });
    return analyzeIssuer(
        { bedrockClient: analysisBedrock, tavilyClient: tavilyClient(), modelId: options.modelId },
        issuerName,
        options.onEvent,
    );
}
