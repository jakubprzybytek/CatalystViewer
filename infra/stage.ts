// Stage-specific behaviour lives here, so infra code checks flags instead of stage names.
// What each stage is for: docs/development.md.

const stage = $app.stage;

export const isProd = stage === "prod";

// Bonds Updater schedule runs only where live data lives.
const SCHEDULED_STAGES = ["prod"];
export const scheduleEnabled = !$dev && SCHEDULED_STAGES.includes(stage);

// prod lives at the bare domain, other stages under a prefix.
export const siteDomain = isProd ? "catalyst.albedoonline.com" : `${stage}.catalyst.albedoonline.com`;
