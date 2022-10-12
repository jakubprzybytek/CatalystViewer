import { lambdaHandler, Success } from "../HandlerProxy";

export const handler = lambdaHandler<string>(async event => {
    if (process.env.BOND_DETAILS_TABLE_NAME === undefined) {
        throw new Error('Bond Details Table Name is not defined');
    }

    return Success('bonds');
});
