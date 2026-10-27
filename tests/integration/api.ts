// Calls the stage's API as the test user. Run inside `sst shell --stage <stage>` (npm run test:integration).
import { Resource } from "sst";

if (Resource.App.stage === "prod") throw new Error("Integration tests never run against prod");

type TestUser = { email: string; clientId: string };

let accessToken: Promise<string> | undefined;

// Plain-password sign-in (allowed on non-prod app clients only, infra/api.ts).
async function signIn(): Promise<string> {
  const user: TestUser = Resource.TestUser;
  const response = await fetch("https://cognito-idp.eu-west-1.amazonaws.com/", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-amz-json-1.1",
      "X-Amz-Target": "AWSCognitoIdentityProviderService.InitiateAuth",
    },
    body: JSON.stringify({
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: user.clientId,
      AuthParameters: { USERNAME: user.email, PASSWORD: Resource.TestUserPassword.value },
    }),
  });
  // Never print the response: it holds tokens.
  if (!response.ok) throw new Error(`Test user sign-in failed: HTTP ${response.status}`);
  const body = (await response.json()) as { AuthenticationResult?: { AccessToken?: string } };
  const token = body.AuthenticationResult?.AccessToken;
  if (!token) throw new Error("Test user sign-in returned no access token");
  return token;
}

export async function api<T>(path: string, options: { token?: string | null } = {}): Promise<{ status: number; body: T }> {
  const token = options.token === null ? undefined : options.token ?? (await (accessToken ??= signIn()));
  const response = await fetch(`${Resource.Api.url}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const text = await response.text();
  return { status: response.status, body: (text ? JSON.parse(text) : undefined) as T };
}
