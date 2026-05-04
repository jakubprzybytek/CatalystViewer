import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { Logger } from '@aws-lambda-powertools/logger';
import { Resource } from 'sst';
import { Failure, lambdaHandler, Success } from "../HandlerProxy";
import { ProfilesTable } from '@core/storage/profiles';

const logger = new Logger({ serviceName: 'GetProfile' });

const dynamoDBClient = new DynamoDBClient({});

export const handler = lambdaHandler<any>(async event => {
  const userName = (event as any).requestContext.authorizer.jwt.claims.username;

  const profilesTable = new ProfilesTable(dynamoDBClient, Resource.Profiles.name);

  const profile = await profilesTable.get(userName);
  logger.debug('Profile retrieved', { userName, found: profile !== undefined });
  if (profile !== undefined) {
    return Success({
      bondsReportsBrowserSettings: profile.bondsReportsBrowserSettings,
      bondsReportsCurrentSettingsIndex: profile.bondsReportsCurrentSettingsIndex
    });
  }

  return Failure('Profile not found', 404);
});
