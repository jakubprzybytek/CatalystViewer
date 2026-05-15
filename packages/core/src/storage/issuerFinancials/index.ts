export * from './IssuerFinancialsTable';

export type DbIssuerFinancials = {
    issuerName: string;       // PK
    year: number;             // SK
    revenue?: number;
    ebit?: number;
    depreciation?: number;    // D&A — used to compute EBITDA = ebit + depreciation
    interestExpense?: number;
    netProfit?: number;
    totalAssets?: number;
    intangibleAssets?: number;
    equity?: number;
    financialDebt?: number;
    cash?: number;
    currentAssets?: number;
    inventory?: number;
    currentLiabilities?: number;
};
