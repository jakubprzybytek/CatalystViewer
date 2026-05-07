import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';
import { sendEmail } from './EmailClient';

const RECIPIENTS_PARAM_NAME = '/catalyst-viewer/notifications/recipients';

type SendErrorReportInput = {
    error: {
        Error: string;
        Cause: string;
    };
    executionId: string;
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

export async function handler(input: SendErrorReportInput): Promise<void> {
    console.log(`SendErrorReport: executionId=${input.executionId}, error=${input.error.Error}`);

    const recipientEmails = await getNotificationRecipientEmails();
    const stage = process.env.SST_STAGE ?? 'unknown';

    const htmlBody = `
<h2>Bonds Update Step Function Failed</h2>
<p><strong>Stage:</strong> ${stage}</p>
<p><strong>Execution:</strong> ${input.executionId}</p>
<p><strong>Error:</strong> ${input.error.Error}</p>
<pre style="background:#f5f5f5;padding:12px;border-radius:4px;overflow:auto">${input.error.Cause}</pre>
`;

    const textBody = `Bonds Update Step Function Failed\n\nStage: ${stage}\nExecution: ${input.executionId}\nError: ${input.error.Error}\n\n${input.error.Cause}`;

    await sendEmail({
        to: recipientEmails,
        subject: `[${stage}] Catalyst Update Error - ${input.error.Error}`,
        htmlBody,
        textBody,
    });

    console.log(`SendErrorReport: email sent to ${recipientEmails.length} recipients`);
}
