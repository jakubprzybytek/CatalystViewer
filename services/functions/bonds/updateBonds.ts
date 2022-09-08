import { CatalystDailyStatisticsBondDetails, getLatestCatalystDailyStatistics } from '../../bonds/catalyst';

export async function handler (event: any) {
    const bonds: CatalystDailyStatisticsBondDetails[] = await getLatestCatalystDailyStatistics();
    return {
        bonds
    }
}