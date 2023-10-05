import { StackContext, NextjsSite } from "sst/constructs";

export function Default({ stack }: StackContext) {
  const site = new NextjsSite(stack, "site", {
    path: "packages/web",
    environment: {
      NEXT_PUBLIC_AWS_REGION: stack.region,
      NEXT_PUBLIC_API_URL: 'hello world2',
//      NEXT_PUBLIC_API_URL: api.customDomainUrl || api.url,
//      NEXT_PUBLIC_USER_POOL_ID: auth.userPoolId,
//      NEXT_PUBLIC_USER_POOL_CLIENT_ID: auth.userPoolClientId,
  },
  });

  stack.addOutputs({
    SiteUrl: site.url,
  });
}
