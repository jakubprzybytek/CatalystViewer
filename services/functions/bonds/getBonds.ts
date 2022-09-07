import { lambdaHandler, Success } from "functions/HandlerProxy";
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { BondDetails } from '../../bonds';
import { BondDetailsTable } from '../../bonds/storage/BondDetailsTable';
import { YieldToMaturityCalculator } from '../../bonds/formulas/YieldToMaturity';
import { BondReport } from ".";

const dynamoDBClient = new DynamoDBClient({});

export const handler = lambdaHandler<BondReport[]>(async event => {
    if (process.env.BOND_DETAILS_TABLE_NAME === undefined) {
        throw new Error('Bond Details Table Name is not defined');
    }

    const bondDetailsTable = new BondDetailsTable(dynamoDBClient, process.env.BOND_DETAILS_TABLE_NAME);
    const dbBonds = await bondDetailsTable.getAll();

    const bonds = dbBonds.map((dbBond) => {
        const bondDetails: BondDetails = {
            name: dbBond.name,
            isin: dbBond.isin,
            issuer: dbBond.issuer,
            type: dbBond.type,
            nominalValue: dbBond.nominalValue,
            maturityDay: dbBond.maturityDay,
            currentInterestRate: dbBond.currentInterestRate,
            accuredInterest: dbBond.accuredInterest,
        };

        const ytmCalculator = new YieldToMaturityCalculator(bondDetails, 0.0019, 0.19);

        return {
            details: bondDetails,
            closingPrice: dbBond.closingPrice,
            closingPriceYtm: ytmCalculator.forPrice(dbBond.closingPrice)
        }
    });

    return Success(bonds);
});
