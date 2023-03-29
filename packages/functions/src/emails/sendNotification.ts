import { SSMClient, GetParameterCommand, GetParameterCommandInput } from "@aws-sdk/client-ssm";
import { UpdateBondsResult } from "../bonds";
import { sendEmail, SendEmailParams } from "./EmailClient";

const RECIPIENTS_PARAM_NAME = '/catalyst-viewer/notifications/recipients';

type SendNotificationResult = {
  emailSent: boolean
}

const ssmCient = new SSMClient({});

async function getNotificationRecipientEmails(): Promise<string[]> {
  const getRecipientInput: GetParameterCommandInput = {
    Name: RECIPIENTS_PARAM_NAME
  };
  
  const getRecipientCommand = new GetParameterCommand(getRecipientInput);
  const getRecipientResult = await ssmCient.send(getRecipientCommand);
  const recipientsValue = getRecipientResult.Parameter?.Value;

  if (recipientsValue === undefined) {
    throw Error(`Cannot fetch recipients email addresses (ssm:${RECIPIENTS_PARAM_NAME})!`);
  }

  return recipientsValue.split(',');
}

export async function handler(updateBondsReport: UpdateBondsResult): Promise<SendNotificationResult> {
  console.log('Sending notification with bonds update results');
  console.log(`Bonds updated: ${updateBondsReport.bondsUpdated}`);
  console.log(`New bonds: ${updateBondsReport.newBonds.join(', ')}`);
  console.log(`Decomissioned bonds: ${updateBondsReport.bondsDeactivated.join(', ')}`);

  const emailBody = 
    `Bonds updated: ${updateBondsReport.bondsUpdated}<br \>
    New bonds: ${updateBondsReport.newBonds.join(', ')}<br \>
    Decomissioned bonds: ${updateBondsReport.bondsDeactivated.join(', ')}`;

  const params: SendEmailParams = {
    to: await getNotificationRecipientEmails(),
    subject: 'Bonds Update Report',
    htmlBody: emailBody,
    textBody: emailBody
  };

  return {
    emailSent: await sendEmail(params)
  };
}
