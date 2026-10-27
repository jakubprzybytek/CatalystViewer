/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "catalyst-viewer",
      removal: input?.stage === "prod" ? "retain" : "remove",
      protect: input?.stage === "prod",
      home: "aws",
      providers: {
        aws: {
          region: "eu-west-1",
        },
      },
    };
  },
  async run() {
    await import("./infra/storage");
    await import("./infra/api");
    await import("./infra/updater");
    await import("./infra/analysis");
    const { outputs } = await import("./infra/web");
    // siteUrl, apiUrl: printed after a deploy and written to .sst/outputs.json (used by cd.yml's prod checks)
    return outputs;
  },
});
