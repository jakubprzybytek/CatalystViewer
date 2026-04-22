import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { Resource } from 'sst';
import { Failure, lambdaHandler, Success } from "../HandlerProxy";
import { ProfilesTable } from '@core/storage/profiles';

const dynamoDBClient = new DynamoDBClient({});

export const handler = lambdaHandler<any>(async event => {
  const userName = (event as any).requestContext.authorizer.jwt.claims.username;

  const profilesTable = new ProfilesTable(dynamoDBClient, Resource.Profiles.name);

  const profile = await profilesTable.get(userName);
  console.debug(profile)
  if (profile !== undefined) {
    return Success({
      bondsReportsBrowserSettings: profile.bondsReportsBrowserSettings,
      bondsReportsCurrentSettingsIndex: profile.bondsReportsCurrentSettingsIndex
    });
  }

  return Failure('Profile not found', 404);
});
