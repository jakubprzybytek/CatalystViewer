import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { Resource } from 'sst';
import { IssuerFinancialsTable } from '@core/storage/issuerFinancials';
import { lambdaHandler, Success } from '../HandlerProxy';

const dynamoDBClient = new DynamoDBClient({});

export const handler = lambdaHandler(async () => {
    const issuerFinancialsTable = new IssuerFinancialsTable(dynamoDBClient, Resource.IssuerFinancials.name);
    const financials = await issuerFinancialsTable.getAll();

    return Success({ financials });
});
