import { Context } from 'aws-lambda';
import { Logger } from '@aws-lambda-powertools/logger';
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';
import { sendEmail } from './EmailClient';
import { AnalyzeIssuerResult } from '../issuers';

const RECIPIENTS_PARAM_NAME = '/catalyst-viewer/notifications/recipients';

const logger = new Logger({ serviceName: 'SendAnalysisReport' });
const ssmClient = new SSMClient({});

type SendAnalysisReportInput = AnalyzeIssuerResult[];

async function getRecipients(): Promise<string[]> {
    const result = await ssmClient.send(new GetParameterCommand({ Name: RECIPIENTS_PARAM_NAME }));
    const value = result.Parameter?.Value;
    if (!value) throw new Error(`Cannot fetch recipients (ssm:${RECIPIENTS_PARAM_NAME})`);
    return value.split(',');
}

export async function handler(input: SendAnalysisReportInput, context: Context): Promise<void> {
    logger.addContext(context);

    const succeeded = input.filter(r => r.success === true) as Extract<AnalyzeIssuerResult, { success: true }>[];
    const failed = input.filter(r => r.success === false) as Extract<AnalyzeIssuerResult, { success: false }>[];

    logger.info('Sending analysis report', { succeeded: succeeded.length, failed: failed.length });

    const lines: string[] = [
        'Fundamental Analysis Report',
        `Date: ${new Date().toISOString()}`,
        '',
        `Analysed: ${succeeded.length} issuer(s)`,
    ];

    for (const r of succeeded) {
        lines.push(`  ✓ ${r.issuerName} — completed at ${r.performedAt}`);
    }

    if (failed.length > 0) {
        lines.push('');
        lines.push(`Failed: ${failed.length} issuer(s)`);
        for (const r of failed) {
            lines.push(`  ✗ ${r.issuerName} — ${r.error}`);
        }
    }

    const textBody = lines.join('\n');
    const htmlBody = `<pre style="font-family:monospace">${textBody.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>`;
    const subject = `[CatalystViewer] Fundamental Analysis — ${succeeded.length} completed, ${failed.length} failed`;

    const recipients = await getRecipients();
    await sendEmail({ to: recipients, subject, htmlBody, textBody });

    logger.info('Analysis report sent');
}
