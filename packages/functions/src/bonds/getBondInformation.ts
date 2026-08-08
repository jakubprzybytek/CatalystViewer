import { Logger } from '@aws-lambda-powertools/logger';
import { getBondInformation, type ObligacjeBondInformation } from '@core/bonds/obligacjepl';
import { Failure, lambdaHandler, Success } from '../HandlerProxy';

const logger = new Logger({ serviceName: 'GetBondInformation' });

export type BondInformationResult = ObligacjeBondInformation;

export const handler = lambdaHandler<BondInformationResult>(async event => {
  const bondName = event.queryStringParameters?.bond?.trim();
  if (!bondName) {
    return Failure("Mandatory parameter is missing: 'bond'");
  }

  logger.info('Fetching bond information', { bondName });
  const bondInformation = await getBondInformation(bondName);
  return Success(bondInformation);
});