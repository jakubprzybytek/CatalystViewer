import { SSTConfig } from "sst";
import { BondsService } from "@/stacks/BondsService";
import { BondsUpdater } from "@/stacks/BondsUpdater";
import { Frontend } from "@/stacks/Frontend";
import { NextjsSite } from "sst/constructs";

export default {
  config(_input) {
    return {
      name: "catalyst-viewer",
      region: "eu-west-1",
    };
  },
  stacks(app) {
    app.setDefaultFunctionProps({
      runtime: "nodejs18.x",
      // srcPath: "services",
    });

    app.stack(BondsService).stack(Frontend);//.stack(BondsUpdater);
    // app.stack(function Site({ stack }) {
    //   const site = new NextjsSite(stack, "site");

    //   stack.addOutputs({
    //     SiteUrl: site.url,
    //   });
    // });
  },
} satisfies SSTConfig;
