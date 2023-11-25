import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { Table } from 'sst/node/table';
import { Failure, lambdaHandler, Success } from "../HandlerProxy";
import { DbProfile, ProfilesTable } from '@catalyst-viewer/core/storage/profiles';

const dynamoDBClient = new DynamoDBClient({});

export const handler = lambdaHandler<any>(async event => {
    const userName = event.requestContext.authorizer.jwt.claims.username;
    const profile = event.body !== undefined ? JSON.parse(event.body) : undefined;

    if (profile === undefined) {
        return Failure('Profile payload missing');
    }

    const profilesTable = new ProfilesTable(dynamoDBClient, Table.Profiles.tableName);

    const dbProfile: DbProfile = {
        userName,
        ...profile
    }

    profilesTable.store(dbProfile);

    return Success({
        message: 'OK'
    });
});
