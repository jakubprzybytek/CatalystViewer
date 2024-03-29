import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { Table } from 'sst/node/table';
import { Failure, lambdaHandler, Success } from "../HandlerProxy";
import { ProfilesTable } from '@catalyst-viewer/core/storage/profiles';

const dynamoDBClient = new DynamoDBClient({});

export const handler = lambdaHandler<any>(async event => {
    const userName = event.requestContext.authorizer.jwt.claims.username;

    const profilesTable = new ProfilesTable(dynamoDBClient, Table.Profiles.tableName);

    const profile = await profilesTable.get(userName);

    return profile !== undefined ? Success(profile) : Failure('Profile not found', 404);
});
