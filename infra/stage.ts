// Stage-specific behaviour lives here, so infra code checks flags instead of stage names.
// What each stage is for: docs/development.md.

const stage = $app.stage;

export const isProd = stage === "prod";

// Bonds Updater schedule runs only where live data lives.
const SCHEDULED_STAGES = ["prod"];
export const scheduleEnabled = !$dev && SCHEDULED_STAGES.includes(stage);

// Cognito groups the API accepts (the pool is shared). The test user's group only off prod.
export const TEST_USER = "catalyst-viewer-test@albedoonline.com";
export const accessGroups = isProd ? ["catalyst-viewer"] : ["catalyst-viewer", "catalyst-viewer-test"];

// prod lives at the bare domain, other stages under a prefix.
export const siteDomain = isProd ? "catalyst.albedoonline.com" : `${stage}.catalyst.albedoonline.com`;
