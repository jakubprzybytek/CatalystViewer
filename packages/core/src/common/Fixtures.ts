import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

// Fixture mode (int): with SOURCE_FIXTURES set to a folder (tests/fixtures/sources, bundled with the Lambda),
// the source fetchers read saved pages and files from it instead of calling gpwcatalyst.pl and obligacje.pl.
export function sourceFixturesDir(): string | undefined {
    return process.env.SOURCE_FIXTURES || undefined;
}

export function fixturePath(dir: string, ...parts: string[]): string {
    return join(dir, ...parts);
}

export function readFixtureText(dir: string, ...parts: string[]): string {
    const path = fixturePath(dir, ...parts);
    if (!existsSync(path)) {
        throw new Error(`No source fixture: ${parts.join('/')}`);
    }
    console.log(`Reading source fixture: ${parts.join('/')}`);
    return readFileSync(path, 'utf-8');
}
