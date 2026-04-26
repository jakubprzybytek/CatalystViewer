import { compile } from 'pug';
import { SSMClient, GetParameterCommand, GetParameterCommandInput } from '@aws-sdk/client-ssm';
import { sendEmail, SendEmailParams } from './EmailClient';
import { ClassifyIssuersResult } from '../issuers';
import { issuerClassificationNotificationTemplate } from './issuerClassificationNotificationTemplate';

const RECIPIENTS_PARAM_NAME = '/catalyst-viewer/notifications/recipients';

type SendClassificationNotificationResult = {
    emailSent: boolean;
};

const ssmClient = new SSMClient({});

async function getNotificationRecipientEmails(): Promise<string[]> {
    const getRecipientInput: GetParameterCommandInput = {
        Name: RECIPIENTS_PARAM_NAME,
    };

    const getRecipientCommand = new GetParameterCommand(getRecipientInput);
    const getRecipientResult = await ssmClient.send(getRecipientCommand);
    const recipientsValue = getRecipientResult.Parameter?.Value;

    if (recipientsValue === undefined) {
        throw Error(`Cannot fetch recipients email addresses (ssm:${RECIPIENTS_PARAM_NAME})!`);
    }

    return recipientsValue.split(',');
}

export async function handler(input: ClassifyIssuersResult): Promise<SendClassificationNotificationResult> {
    console.log(`SendClassificationNotification: ${input.classifiedIssuers.length} classified, ${input.failedIssuers.length} failed`);

    const template = compile(issuerClassificationNotificationTemplate, { pretty: true });
    const emailBody = template({
        dateTime: new Date(),
        classifiedIssuers: input.classifiedIssuers,
        failedIssuers: input.failedIssuers,
    });

    const params: SendEmailParams = {
        to: await getNotificationRecipientEmails(),
        subject: 'Issuer Classification Report',
        htmlBody: emailBody,
        textBody: emailBody,
    };

    return {
        emailSent: await sendEmail(params),
    };
}
