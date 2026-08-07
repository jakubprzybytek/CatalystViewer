import { Logger } from '@aws-lambda-powertools/logger';
import { lambdaHandler, Success } from "../HandlerProxy";
import { getLatestCatalystDailyStatistics, CatalystDailyStatisticsBondDetails } from '@core/bonds/catalyst';

const logger = new Logger({ serviceName: 'GetCatalystDailyStats' });

export type CatalystDailyStatsResult = CatalystDailyStatisticsBondDetails[];

export const handler = lambdaHandler<CatalystDailyStatsResult>(async _event => {
    logger.info('Fetching latest Catalyst daily statistics');
    const stats = await getLatestCatalystDailyStatistics();
    logger.info(`Fetched ${stats.length} bond statistics`);
    return Success(stats);
});
