import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn';
import { lambdaHandler, Success, Failure } from '../HandlerProxy';

const sfnClient = new SFNClient({});

export const handler = lambdaHandler(async (event) => {
    const issuerName = decodeURIComponent(event.pathParameters?.name ?? '');

    if (!issuerName) {
        return Failure('Not found', 404);
    }

    const stateMachineArn = process.env.FUNDAMENTAL_ANALYSIS_STATE_MACHINE_ARN;

    if (!stateMachineArn) {
        return Failure('State machine ARN not configured', 500);
    }

    await sfnClient.send(new StartExecutionCommand({
        stateMachineArn,
        input: JSON.stringify({ issuers: [issuerName] }),
    }));

    return Success({ triggered: true });
});
