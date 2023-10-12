import { Api, StackContext, NextjsSite } from "sst/constructs";

export function Default({ stack }: StackContext) {
  const api2 = new Api(stack, "api2", {
    routes: {
      "GET /": "packages/functions/src/time.handler",
    },
  });

  const site = new NextjsSite(stack, "site", {
    path: "packages/web",
    bind: [api2],
  });

  stack.addOutputs({
    ApiUrl: api2.url,
    SiteUrl: site.url,
  });
}
