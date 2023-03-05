import { SSTConfig } from "sst";
import { BondsService } from "./stacks/BondsService";
import { BondsUpdater } from "./stacks/BondsUpdater";
import { Frontend } from "./stacks/Frontend";

export default {
  config(_input) {
    return {
      name: "catalyst-viewer",
      region: "eu-west-1",
    };
  },
  stacks(app) {
    app.setDefaultFunctionProps({
      //runtime: "nodejs16.x",
      architecture: "arm_64",
      memorySize: '128 MB',
      timeout: '20 seconds',
      // srcPath: "services",
      // bundle: {
      //   format: "esm",
      // },
    });

    app.stack(BondsService).stack(Frontend).stack(BondsUpdater);
    // app.stack(BondsService).stack(BondsUpdater);
  },
} satisfies SSTConfig;
