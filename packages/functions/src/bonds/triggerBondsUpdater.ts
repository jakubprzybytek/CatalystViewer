import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn';
import { Failure, lambdaHandler, Success } from '../HandlerProxy';

const sfnClient = new SFNClient({});

type BondsUpdaterInput = {
  updateBonds: boolean;
  classificationsCap: number;
  forceClassification: boolean;
};

function parseInput(body: string | undefined): BondsUpdaterInput | undefined {
  if (body === undefined) {
    return undefined;
  }

  const input: unknown = JSON.parse(body);
  if (typeof input !== 'object' || input === null) {
    return undefined;
  }

  const { updateBonds, classificationsCap, forceClassification } = input as Record<string, unknown>;
  if (
    typeof updateBonds !== 'boolean' ||
    typeof classificationsCap !== 'number' ||
    !Number.isInteger(classificationsCap) ||
    classificationsCap < 0 ||
    typeof forceClassification !== 'boolean'
  ) {
    return undefined;
  }

  return { updateBonds, classificationsCap, forceClassification };
}

export const handler = lambdaHandler<{ executionArn: string }>(async event => {
  const input = parseInput(event.body);
  if (!input) {
    return Failure('Invalid Bonds Updater input.');
  }

  const stateMachineArn = process.env.BONDS_UPDATER_STATE_MACHINE_ARN;
  if (!stateMachineArn) {
    return Failure('State machine ARN not configured', 500);
  }

  const execution = await sfnClient.send(new StartExecutionCommand({
    stateMachineArn,
    input: JSON.stringify(input),
  }));

  return Success({ executionArn: execution.executionArn ?? '' });
});