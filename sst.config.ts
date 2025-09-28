import { SSTConfig } from "sst";
import { BondsService } from "./stacks/BondsService";
import { Frontend } from "./stacks/Frontend";
import { BondsUpdater } from "./stacks/BondsUpdater";

export default {
  config(_input) {
    return {
      name: "catalyst-viewer",
      region: "eu-west-1",
    };
  },
  stacks(app) {
    app.setDefaultFunctionProps({
      runtime: "nodejs20.x",
    });

    //app.stack(Default).stack(BondsService);
    app.stack(BondsService).stack(Frontend).stack(BondsUpdater);
  }
} satisfies SSTConfig;
