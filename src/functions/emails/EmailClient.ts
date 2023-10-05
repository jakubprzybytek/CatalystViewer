import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

export type SendEmailParams = {
  to: string[],
  subject: string,
  htmlBody: string,
  textBody: string
};

const client = new SESClient({});

export async function sendEmail(params: SendEmailParams): Promise<boolean> {
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
