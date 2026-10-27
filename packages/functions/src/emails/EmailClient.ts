import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

export type SendEmailParams = {
  to: string[],
  subject: string,
  htmlBody: string,
  textBody: string
};

const client = new SESClient({});

// EMAIL_MODE=log (every stage but prod, infra/stage.ts): log the email instead of sending it.
export const emailsLoggedOnly = (): boolean => process.env.EMAIL_MODE === 'log';

export async function sendEmail(params: SendEmailParams): Promise<boolean> {
    if (emailsLoggedOnly()) {
        console.log(JSON.stringify({ message: 'Email not sent (EMAIL_MODE=log)', subject: params.subject, recipients: params.to.length, textBody: params.textBody }));
        return true;
    }

    const input = {
        "Destination": {
          "ToAddresses": params.to
        },
        "Message": {
          "Body": {
            "Html": {
              "Charset": "UTF-8",
              "Data": params.htmlBody
            },
            "Text": {
              "Charset": "UTF-8",
              "Data": params.textBody
            }
          },
          "Subject": {
            "Charset": "UTF-8",
            "Data": params.subject
          }
        },
        "Source": "Catalyst Viewer Notifications <notifications@catalyst-sender.albedoonline.com>"
      };
    const command = new SendEmailCommand(input);
    const response = await client.send(command);

    return response.$metadata.httpStatusCode == 200;
}
