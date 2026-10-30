import { describe, expect, it } from 'vitest';
import { buildTaskPrompt } from './IssuerAnalysis';

describe('buildTaskPrompt', () => {
  it("gives the model today's date, so it can tell which years are complete", () => {
    const prompt = buildTaskPrompt('Dadelo S.A.', new Date('2026-10-30T13:00:00Z'));
    expect(prompt).toContain('Nazwa spółki: "Dadelo S.A."');
    expect(prompt).toContain('Dzisiejsza data: 2026-10-30');
  });
});
