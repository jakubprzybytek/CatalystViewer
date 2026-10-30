// Runs the AI features on this machine, through the same entry points as the Lambdas (IssuerAI.ts).
// Nothing is stored. Usage and costs: docs/development.md, "Testing the AI features locally".
//
//   npm run classify-issuer -- "Kruk S.A."
//   npm run analyze-issuer -- "Dadelo S.A." [--model haiku_4.5|sonnet_4.6|sonnet_5.5] [--out <file.json>]
import { writeFileSync } from 'node:fs';
import type { AgentEvent } from '../agent/Tool';
import { MODEL_ALIASES, resolveModelId, type ModelAlias } from '../models';
import { runAnalysis, runClassification } from './IssuerAI';
import { aiStubbed } from './IssuerStubs';

const USAGE = [
    'Usage:',
    '  npm run classify-issuer -- "<Issuer Name>"',
    '  npm run analyze-issuer -- "<Issuer Name>" [--model ' + MODEL_ALIASES.join('|') + '] [--out <file.json>]',
].join('\n');

function fail(message: string): never {
    console.error(`${message}\n\n${USAGE}`);
    process.exit(1);
}

function parseArgs(args: string[]) {
    const [command, ...rest] = args;
    const positional: string[] = [];
    const flags: Record<string, string> = {};
    for (let i = 0; i < rest.length; i++) {
        if (rest[i].startsWith('--')) {
            const value = rest[i + 1];
            if (value === undefined || value.startsWith('--')) fail(`Missing value for ${rest[i]}`);
            flags[rest[i].slice(2)] = value;
            i++;
        } else {
            positional.push(rest[i]);
        }
    }
    return { command, issuerName: positional[0], flags };
}

// One line per agent step, as it happens, plus the token total at the end.
function progressPrinter() {
    const tokens = { input: 0, output: 0 };
    const onEvent = (event: AgentEvent) => {
        switch (event.type) {
            case 'tool_use':
                console.log(`  [${event.iteration}] ${event.toolName} ${JSON.stringify(event.input)}`);
                break;
            case 'tool_result': {
                const status = event.isError ? 'error' : 'ok';
                console.log(`  [${event.iteration}] ${event.toolName} → ${status}, ${event.result.length} chars`);
                break;
            }
            case 'end_turn':
                console.log(`  [${event.iteration}] answer`);
                break;
            case 'usage':
                tokens.input += event.inputTokens;
                tokens.output += event.outputTokens;
                break;
        }
    };
    const summary = () => `Tokens: ${tokens.input} in, ${tokens.output} out`;
    return { onEvent, summary };
}

async function classify(issuerName: string) {
    const progress = progressPrinter();
    const result = await runClassification(issuerName, progress.onEvent);
    console.log(`\nIndustry:         ${result.industry}`);
    console.log(`Business summary: ${result.businessSummary}`);
    console.log(`Website:          ${result.websiteUrl}`);
    console.log(`Model:            ${result.modelId}`);
    console.log(progress.summary());
}

function modelIdFrom(alias: string | undefined): string | undefined {
    if (alias === undefined) return undefined;
    if (!(MODEL_ALIASES as readonly string[]).includes(alias)) fail(`Unknown model "${alias}"`);
    return resolveModelId(alias as ModelAlias);
}

async function analyze(issuerName: string, flags: Record<string, string>, modelId: string | undefined) {
    const progress = progressPrinter();
    const result = await runAnalysis(issuerName, { modelId, onEvent: progress.onEvent });

    // The report as the app shows it, without the agent steps already printed above.
    console.log(`\n${result.reportMarkdown.split('\n## Agent Steps')[0].trim()}\n`);
    console.log(`Model: ${result.modelId}`);
    console.log(progress.summary());

    if (flags.out) {
        // Same fields the Lambda stores as the #ANALYSIS record.
        writeFileSync(flags.out, JSON.stringify({ performedAt: new Date().toISOString(), ...result }, null, 2));
        console.log(`Saved to ${flags.out}`);
    }
}

async function main() {
    const { command, issuerName, flags } = parseArgs(process.argv.slice(2));
    if (command !== 'classify' && command !== 'analyze') fail('Unknown command "' + (command ?? '') + '"');
    if (!issuerName) fail('Missing issuer name');
    if (command === 'classify' && Object.keys(flags).length > 0) fail('classify takes no options');
    const unknownFlag = Object.keys(flags).find(f => f !== 'model' && f !== 'out');
    if (unknownFlag) fail(`Unknown option --${unknownFlag}`);
    const modelId = modelIdFrom(flags.model);

    const mode = aiStubbed() ? 'stubbed AI (AI_MODE=stub), nothing is paid for' : 'Bedrock and Tavily, paid';
    console.log(`${command === 'classify' ? 'Classifying' : 'Analysing'} "${issuerName}" with ${mode}\n`);

    if (command === 'classify') await classify(issuerName);
    else await analyze(issuerName, flags, modelId);
}

main().catch((error) => {
    console.error('\nFailed:', error instanceof Error ? error.message : error);
    process.exit(1);
});
