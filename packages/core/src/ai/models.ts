export const MODEL_IDS = {
    haiku_4_5: 'arn:aws:bedrock:eu-west-1:198805281865:inference-profile/global.anthropic.claude-haiku-4-5-20251001-v1:0',
    sonnet_4_6: 'arn:aws:bedrock:eu-west-1:198805281865:inference-profile/global.anthropic.claude-sonnet-4-6',
    opus_4_6: 'arn:aws:bedrock:eu-west-1:198805281865:inference-profile/global.anthropic.claude-opus-4-6-v1',
    sonnet_5_5: 'arn:aws:bedrock:eu-west-1:198805281865:inference-profile/global.anthropic.claude-sonnet-5-5',
} as const;

export const MODEL_ALIASES = ['haiku_4.5', 'sonnet_4.6', 'opus_4.6', 'sonnet_5.5'] as const;

export type ModelAlias = typeof MODEL_ALIASES[number];

// Model for every AI task (classification, fundamental analysis), on prod and locally;
// `npm run analyze-issuer -- --model` overrides it for one analysis.
export const DEFAULT_MODEL_ALIAS: ModelAlias = 'sonnet_4.6';

export function resolveModelId(alias: ModelAlias): string {
    switch (alias) {
        case 'haiku_4.5': return MODEL_IDS.haiku_4_5;
        case 'sonnet_4.6': return MODEL_IDS.sonnet_4_6;
        case 'opus_4.6': return MODEL_IDS.opus_4_6;
        case 'sonnet_5.5': return MODEL_IDS.sonnet_5_5;
    }
}
