# Fundamental Analysis Markings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a compact FA badge next to the industry chip on the IssuerCard, always visible (not inside the collapsible section), displaying one colored dot per scorecard dimension.

**Architecture:** Extract the shared signal-dot rendering into a new file so both `IssuerScorecard` and the new FA badge can reuse it. Add the FA badge inline with the industry chip in `IssuerCard`.

**Tech Stack:** React, MUI (Chip, Box, Stack), existing `FundamentalScorecard` / `Signal` types.

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `packages/web/src/components/BondReportsBrowser/issuers/SignalDot.tsx` | Shared `SignalDot` component + `SIGNAL_COLOR` / `SIGNAL_LABEL` maps |
| Modify | `packages/web/src/components/BondReportsBrowser/issuers/IssuerScorecard.tsx` | Import `SignalDot` from the new shared file instead of defining it locally |
| Modify | `packages/web/src/components/BondReportsBrowser/issuers/IssuerCard.tsx` | Add FA badge (always visible) next to the industry chip |

---

### Task 1: Extract `SignalDot` to a shared file

**Files:**
- Create: `packages/web/src/components/BondReportsBrowser/issuers/SignalDot.tsx`

- [ ] Create `SignalDot.tsx` exporting `SIGNAL_COLOR`, `SIGNAL_LABEL`, and the `SignalDot` component (move the existing definitions verbatim from `IssuerScorecard.tsx`):

```tsx
import Box from '@mui/material/Box';
import type { Signal } from '@/bonds/fundamentals/scorecard';

export const SIGNAL_COLOR: Record<Signal, string> = {
  green: '#4ade80',
  yellow: '#facc15',
  red: '#f87171',
  na: '#cbd5e1',
};

export const SIGNAL_LABEL: Record<Signal, string> = {
  green: '●',
  yellow: '●',
  red: '●',
  na: '○',
};

export function SignalDot({ signal }: { signal: Signal }) {
  return (
    <Box
      component='span'
      sx={{ color: SIGNAL_COLOR[signal], fontSize: '1.1rem', lineHeight: 1 }}
      aria-label={signal}
    >
      {SIGNAL_LABEL[signal]}
    </Box>
  );
}
```

- [ ] Commit: `feat: extract SignalDot to shared component`

---

### Task 2: Update `IssuerScorecard` to use the shared `SignalDot`

**Files:**
- Modify: `packages/web/src/components/BondReportsBrowser/issuers/IssuerScorecard.tsx`

- [ ] Remove the local `SIGNAL_COLOR`, `SIGNAL_LABEL`, and `SignalDot` definitions.
- [ ] Add import: `import { SignalDot } from './SignalDot';`
- [ ] Verify the file still compiles (`pnpm tsc --noEmit` from repo root or `packages/web`).
- [ ] Commit: `refactor: use shared SignalDot in IssuerScorecard`

---

### Task 3: Add FA badge to `IssuerCard`

**Files:**
- Modify: `packages/web/src/components/BondReportsBrowser/issuers/IssuerCard.tsx`

The industry row currently renders a single `Chip` inside a `Box`. When a scorecard exists, a second badge should appear in the same row.

- [ ] Add the `SignalDot` import at the top of `IssuerCard.tsx`:

```tsx
import { SignalDot } from './SignalDot';
```

- [ ] Replace the industry `CardSectionRow` block (the one guarded by `issuerReport.industry && industryColors`) with the version below, which wraps both chips in a `Stack` so they sit side-by-side and the FA badge renders whenever `issuerReport.scorecard` has dimensions:

```tsx
{(issuerReport.industry && industryColors || issuerReport.scorecard) && (
  <CardSectionRow>
    <Stack direction='row' spacing={0.5} sx={{ mt: -1 }} alignItems='center' flexWrap='wrap'>
      {issuerReport.industry && industryColors && (
        <Chip
          size='small'
          label={issuerReport.industry}
          sx={{
            backgroundColor: industryColors.backgroundColor,
            color: industryColors.color,
            filter: 'saturate(85%)',
            fontWeight: 400,
          }}
        />
      )}
      {issuerReport.scorecard && issuerReport.scorecard.dimensions.length > 0 && (
        <Chip
          size='small'
          label={
            <Stack direction='row' alignItems='center' spacing={0}>
              <span>FA:&nbsp;</span>
              {issuerReport.scorecard.dimensions.map((d, i) => (
                <SignalDot key={i} signal={d.signal} />
              ))}
            </Stack>
          }
          sx={{ fontWeight: 400, backgroundColor: 'var(--cv-bg-card-subtle)' }}
        />
      )}
    </Stack>
  </CardSectionRow>
)}
```

- [ ] Add `Stack` to the MUI imports at the top of `IssuerCard.tsx` if not already imported (it already is).
- [ ] Run `pnpm tsc --noEmit` and confirm no type errors.
- [ ] Visually verify in the browser:
  - Issuers with both industry and scorecard show two chips.
  - Issuers with only industry show one chip.
  - Issuers with only a scorecard (no industry) show only the FA chip.
  - FA badge is always visible without expanding the card.
- [ ] Commit: `feat: show FA badge on IssuerCard (story #7)`
