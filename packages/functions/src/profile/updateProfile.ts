import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { Resource } from 'sst';
import { Failure, lambdaHandler, Success } from "../HandlerProxy";
import { DbProfile, ProfilesTable } from '@core/storage/profiles';

const dynamoDBClient = new DynamoDBClient({});

export const handler = lambdaHandler<{ message: string }>(async event => {
    const userName = (event as any).requestContext.authorizer.jwt.claims.username;
    const profile = event.body !== undefined ? JSON.parse(event.body) : undefined;

    if (profile === undefined) {
        return Failure('Profile payload missing');
    }

    const profilesTable = new ProfilesTable(dynamoDBClient, Resource.Profiles.name);

    const dbProfile: DbProfile = {
        userName,
        ...profile
    }

    profilesTable.store(dbProfile);

    return Success({
        message: 'OK'
    });
});
