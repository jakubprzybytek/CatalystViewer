// Stubbed AI (AI_MODE=stub, every stage but prod, infra/stage.ts): fixed answers instead of Bedrock and Tavily,
// so tests get the same result every time and nothing is paid for.
import type { ClassificationResponse } from './IssuerClassification';
import { toAnalysisResult, type AgentFinancials, type IssuerAnalysisResult } from './IssuerAnalysis';

export const STUB_MODEL_ID = 'stub';

export const aiStubbed = (): boolean => process.env.AI_MODE === 'stub';

export function stubClassification(issuerName: string): ClassificationResponse {
    return {
        industry: 'Other',
        businessSummary: `Stub classification of ${issuerName}: AI is stubbed on this stage.`,
        websiteUrl: '',
    };
}

const STUB_FINANCIALS: Omit<AgentFinancials, 'companyName'> = {
    currency: 'PLN',
    unit: 'mln',
    notes: 'Stub analysis: fixed figures, AI is stubbed on this stage.',
    years: [
        { year: 2023, revenue: 400, ebit: 40, depreciation: 10, interestExpense: 8, netProfit: 25, totalAssets: 900, intangibleAssets: 20, equity: 300, financialDebt: 350, cash: 50, currentAssets: 400, inventory: 150, currentLiabilities: 250 },
        { year: 2024, revenue: 450, ebit: 50, depreciation: 12, interestExpense: 9, netProfit: 32, totalAssets: 950, intangibleAssets: 20, equity: 330, financialDebt: 340, cash: 60, currentAssets: 420, inventory: 160, currentLiabilities: 240 },
    ],
};

export function stubAnalysis(issuerName: string): IssuerAnalysisResult {
    return toAnalysisResult(issuerName, { companyName: issuerName, ...STUB_FINANCIALS }, [], STUB_MODEL_ID);
}
