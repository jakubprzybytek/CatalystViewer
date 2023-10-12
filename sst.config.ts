import { SSTConfig } from "sst";
import { BondsService } from "./stacks/BondsService";
// import { BondsUpdater } from "./stacks/BondsUpdater";
import { Frontend } from "./stacks/Frontend";
// import { Default } from "./stacks/Default";

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
    });
    app.stack(BondsService).stack(Frontend);
  }
} satisfies SSTConfig;
