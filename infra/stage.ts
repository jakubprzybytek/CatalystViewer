// Stage-specific behaviour lives here, so infra code checks flags instead of stage names.
// What each stage is for: docs/development.md.

import fixtures from "../tests/fixtures/metadata.json";

const stage = $app.stage;

export const isProd = stage === "prod";

// Bonds Updater schedule runs only where live data lives.
const SCHEDULED_STAGES = ["prod"];
export const scheduleEnabled = !$dev && SCHEDULED_STAGES.includes(stage);

// Cognito groups the API accepts (the pool is shared). The test user's group only off prod.
export const TEST_USER = "catalyst-viewer-test@albedoonline.com";
export const accessGroups = isProd ? ["catalyst-viewer"] : ["catalyst-viewer", "catalyst-viewer-test"];

// int is the pipeline's test stage: the Bonds Updater reads fixture files instead of the live sites, and the
// date-dependent code runs at the fixtures' reference date (tests/fixtures, docs/testing.md).
export const useFixtures = stage === "int";
export const referenceDate: string | undefined = useFixtures ? fixtures.referenceDate : undefined;

// AI (Bedrock, Tavily) and emails are real only on prod; elsewhere stubbed and logged.
// Passed to every function (sst.config.ts) and read by the code: AI_MODE, EMAIL_MODE, REFERENCE_DATE.
export const functionEnvironment: Record<string, string> = {
  ...(isProd ? {} : { AI_MODE: "stub", EMAIL_MODE: "log" }),
  ...(referenceDate ? { REFERENCE_DATE: referenceDate } : {}),
};

// prod lives at the bare domain, other stages under a prefix.
export const siteDomain = isProd ? "catalyst.albedoonline.com" : `${stage}.catalyst.albedoonline.com`;
