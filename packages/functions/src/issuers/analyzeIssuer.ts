import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { Context } from 'aws-lambda';
import { Logger } from '@aws-lambda-powertools/logger';
import { Resource } from 'sst';
import { TavilyClient } from '@core/ai/tools/tavily/TavilyClient';
import { analyzeIssuer } from '@core/ai/issuers/IssuerAnalysis';
import { IssuerProfilesTable } from '@core/storage/issuerProfiles';
import { AnalyzeIssuerInput, AnalyzeIssuerResult } from '.';

const logger = new Logger({ serviceName: 'AnalyzeIssuer' });

const bedrockClient = new BedrockRuntimeClient({});
const dynamoDBClient = new DynamoDBClient({});

export async function handler(input: AnalyzeIssuerInput, context: Context): Promise<AnalyzeIssuerResult> {
    logger.addContext(context);
    logger.info('Starting analysis', { issuerName: input.issuerName });

    const tavilyApiKey = process.env.TAVILY_API_KEY;
    if (!tavilyApiKey) {
        throw new Error('TAVILY_API_KEY environment variable is not set');
    }

    const tavilyClient = new TavilyClient(tavilyApiKey);
    const issuerProfilesTable = new IssuerProfilesTable(dynamoDBClient, Resource.IssuerProfiles.name);

    const result = await analyzeIssuer({ bedrockClient, tavilyClient }, input.issuerName);

    const now = new Date();
    await issuerProfilesTable.storeAnalysis({
        issuerName: result.issuerName,
        recordType: `#ANALYSIS#${now.toISOString()}`,
        performedAt: now.toISOString(),
        performedAtTs: now.getTime(),
        modelId: result.modelId,
        scorecard: result.scorecard,
        agentFinancials: result.agentFinancials,
        agentLog: result.agentLog,
        reportMarkdown: result.reportMarkdown,
    });

    logger.info('Analysis complete and stored', { issuerName: result.issuerName });

    return {
        issuerName: result.issuerName,
        performedAt: now.toISOString(),
        success: true,
    };
}
