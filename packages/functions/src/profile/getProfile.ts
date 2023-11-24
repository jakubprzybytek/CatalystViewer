import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { lambdaHandler, Success } from "../HandlerProxy";

const dynamoDBClient = new DynamoDBClient({});

export const handler = lambdaHandler<any>(async event => {
    if (process.env.BOND_DETAILS_TABLE_NAME === undefined) {
        throw new Error('Bond Details Table Name is not defined');
    }


    return Success({
        hello: event,
        accountId: event.requestContext.accountId
    });
});
