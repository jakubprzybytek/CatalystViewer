import { App } from "@serverless-stack/resources";
import { BondsService } from "./BondsService";
import { BondsUpdater } from "./BondsUpdater";
import { Frontend } from "./Frontend";

export default function (app: App) {
  app.setDefaultFunctionProps({
    runtime: "nodejs16.x",
    memorySize: '256 MB',
    srcPath: "services",
    bundle: {
      format: "esm",
    },
  });
  app.stack(BondsService).stack(Frontend).stack(BondsUpdater);
}
