// Stage-specific behaviour lives here, so infra code checks flags instead of stage names.
// See docs/sdlc.md for what each stage is for.

const stage = $app.stage;

export const isProd = stage === "prod";

// Bonds Updater schedule runs only where live data lives (see docs/sdlc.md).
const SCHEDULED_STAGES = ["prod"];
export const scheduleEnabled = !$dev && SCHEDULED_STAGES.includes(stage);

// prod lives at the bare domain, other stages under a prefix.
export const siteDomain = isProd ? "catalyst.albedoonline.com" : `${stage}.catalyst.albedoonline.com`;
