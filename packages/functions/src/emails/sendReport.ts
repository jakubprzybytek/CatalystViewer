import { compileFile } from 'pug';
import { SSMClient, GetParameterCommand, GetParameterCommandInput } from '@aws-sdk/client-ssm';
import { sendEmail, SendEmailParams } from './EmailClient';
import { SendReportInput } from '../issuers';
import { UpdatedBond } from '../bonds';
import { formatCurrency, formatCompactCurrency } from '@core/common/Formats';

const RECIPIENTS_PARAM_NAME = '/catalyst-viewer/notifications/recipients';

type SendReportResult = {
    emailSent: boolean;
};

type FormattedBond = Omit<UpdatedBond, 'nominalValue' | 'issueValue'> & {
    nominalValue: string;
    issueValue: string;
};

function formatBond(bond: UpdatedBond): FormattedBond {
    return {
        ...bond,
        nominalValue: formatCurrency(bond.nominalValue, bond.currency).replace('\u00a0', ' ').replace('ł', 'l'),
        issueValue: formatCompactCurrency(bond.issueValue, bond.currency).replace('ł', 'l'),
    };
}

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

export async function handler(input: SendReportInput): Promise<SendReportResult> {
    const classifiedIssuers = input.classifiedIssuers ?? [];
    const failedIssuers = input.failedIssuers ?? [];

    console.log(`SendReport: newBonds=${input.newBonds.length}, bondsDeactivated=${input.bondsDeactivated.length}, classifiedIssuers=${classifiedIssuers.length}, failedIssuers=${failedIssuers.length}`);

    const template = compileFile('packages/functions/src/emails/reportNotification.pug', { pretty: true });
    const emailBody = template({
        dateTime: new Date(),
        newBonds: input.newBonds.map(formatBond),
        bondsDeactivated: input.bondsDeactivated.map(formatBond),
        classifiedIssuers,
        failedIssuers,
    });

    const params: SendEmailParams = {
        to: await getNotificationRecipientEmails(),
        subject: 'Catalyst Update Report',
        htmlBody: emailBody,
        textBody: emailBody,
    };

    return {
        emailSent: await sendEmail(params),
    };
}
