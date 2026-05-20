import { compile } from 'pug';
import { Context } from 'aws-lambda';
import { Logger } from '@aws-lambda-powertools/logger';
import templateSource from './reportNotification.pug';
import { SSMClient, GetParameterCommand, GetParameterCommandInput } from '@aws-sdk/client-ssm';
import { sendEmail, SendEmailParams } from './EmailClient';
import { SendReportInput, ClassifiedIssuerResult, FailedIssuerResult } from '../issuers';
import { UpdatedBond } from '../bonds';
import { formatCurrency, formatCompactCurrency } from '@core/common/Formats';

const RECIPIENTS_PARAM_NAME = '/catalyst-viewer/notifications/recipients';

const logger = new Logger({ serviceName: 'SendReport' });

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

export async function handler(input: SendReportInput, context: Context): Promise<SendReportResult> {
    logger.addContext(context);

    const classificationResults = input.classificationResults ?? [];
    const classifiedIssuers = classificationResults.filter((r): r is ClassifiedIssuerResult => r.success);
    const failedIssuers = classificationResults.filter((r): r is FailedIssuerResult => !r.success);

    logger.info('Sending report', { newBonds: input.newBonds.length, bondsDeactivated: input.bondsDeactivated.length, classifiedIssuers: classifiedIssuers.length, failedIssuers: failedIssuers.length });

    const template = compile(templateSource, { pretty: true });
    const emailBody = template({
        dateTime: new Date(),
        stage: process.env.SST_STAGE ?? 'unknown',
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
