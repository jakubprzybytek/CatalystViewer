import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';
import { sendEmail } from './EmailClient';

const RECIPIENTS_PARAM_NAME = '/catalyst-viewer/notifications/recipients';

type SendErrorReportInput = {
    error: {
        Error: string;
        Cause: string;
    };
    executionArn: string;
};

const ssmClient = new SSMClient({});

async function getNotificationRecipientEmails(): Promise<string[]> {
    const result = await ssmClient.send(new GetParameterCommand({ Name: RECIPIENTS_PARAM_NAME }));
    const value = result.Parameter?.Value;

    if (value === undefined) {
        throw Error(`Cannot fetch recipients email addresses (ssm:${RECIPIENTS_PARAM_NAME})!`);
    }

    return value.split(',');
}

function consoleLink(executionArn: string): string {
    // ARN format: arn:aws:states:REGION:ACCOUNT:execution:STATE_MACHINE:NAME
    const region = executionArn.split(':')[3];
    const encoded = encodeURIComponent(executionArn);
    return `https://${region}.console.aws.amazon.com/states/home?region=${region}#/executions/details/${encoded}`;
}

export async function handler(input: SendErrorReportInput): Promise<void> {
    console.log(`SendErrorReport: executionArn=${input.executionArn}, error=${input.error.Error}`);

    const recipientEmails = await getNotificationRecipientEmails();
    const stage = process.env.SST_STAGE ?? 'unknown';
    const link = consoleLink(input.executionArn);

    const htmlBody = `
<h2>Bonds Update Step Function Failed</h2>
<p><strong>Stage:</strong> ${stage}</p>
<p><strong>Error:</strong> ${input.error.Error}</p>
<p><strong>Execution:</strong> <a href="${link}">${input.executionArn}</a></p>
<p style="color:#888;font-size:0.9em">(Open the link to see which step failed and its full context.)</p>
<pre style="background:#f5f5f5;padding:12px;border-radius:4px;overflow:auto">${input.error.Cause}</pre>
`;

    const textBody = `Bonds Update Step Function Failed\n\nStage: ${stage}\nError: ${input.error.Error}\nExecution: ${input.executionArn}\nConsole: ${link}\n\n${input.error.Cause}`;

    await sendEmail({
        to: recipientEmails,
        subject: `[${stage}] Catalyst Update Error - ${input.error.Error}`,
        htmlBody,
        textBody,
    });

    console.log(`SendErrorReport: email sent to ${recipientEmails.length} recipients`);
}
