import { lambdaHandler, Success } from "functions/HandlerProxy";
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { BondDetailsTable } from "bonds/storage/BondDetailsTable";
import { DbBondDetails } from "bonds/storage";

const dynamoDBClient = new DynamoDBClient({});

export const handler = lambdaHandler<DbBondDetails[]>(async event => {
    const bondDetailsTable = new BondDetailsTable(dynamoDBClient, process.env.BOND_DETAILS_TABLE_NAME);
    const bonds = await bondDetailsTable.getAll();

    return Success(bonds);
});
