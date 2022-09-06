import { App } from "@serverless-stack/resources";
import { BondsService } from "./BondsService";
import { Frontend } from "./Frontend";

export default function (app: App) {
  app.setDefaultFunctionProps({
    runtime: "nodejs16.x",
    srcPath: "services",
    bundle: {
      format: "esm",
    },
  });
  app.stack(BondsService).stack(Frontend);
}
