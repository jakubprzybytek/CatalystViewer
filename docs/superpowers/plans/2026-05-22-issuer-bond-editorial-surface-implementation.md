# Issuer/Bond Editorial Surface Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the approved editorial visual refresh for issuer and bond views with improved card/surface contrast and no behavior regressions.

**Architecture:** Apply the refresh primarily via shared global surface tokens and scoped card classes, then add small component-level adjustments for selected/expanded states. Keep data flow and interaction logic unchanged.

**Tech Stack:** Next.js, React, MUI, global CSS, Vitest

---

### Task 1: Lock visual baseline with a failing test

**Files:**
- Create: `packages/web/src/common/ColorCodes.test.ts`
- Modify: `packages/web/src/common/ColorCodes.tsx`

- [ ] Add a failing unit test asserting the `white` marker is no longer literal white.
- [ ] Run targeted test and confirm failure.
- [ ] Update `white` marker to neutral tinted badge colors.
- [ ] Re-run targeted test and confirm pass.

### Task 2: Add editorial surface tokens and shared card treatment

**Files:**
- Modify: `packages/web/styles/globals.css`

- [ ] Add `:root` surface/text/shadow tokens.
- [ ] Replace flat page background with gradient canvas.
- [ ] Add shared `.issuer-card` and `.bond-card` surface treatment (background, border, shadow, hover).
- [ ] Improve card caption/tiny text contrast and section divider styles.

### Task 3: Implement issuer card selected/expanded refinements

**Files:**
- Modify: `packages/web/src/components/BondReportsBrowser/issuers/IssuerCard.tsx`

- [ ] Replace old selected fill with `selected` class and accent-bar state.
- [ ] Add expanded content wrapper class for subtle tinted panel.
- [ ] Tighten title typographic emphasis and preserve existing interactions.

### Task 4: Implement bond card expanded/state refinements

**Files:**
- Modify: `packages/web/src/components/BondReportsBrowser/bonds/BondCard/BondCardDetailsSection.tsx`
- Modify: `packages/web/src/components/BondReportsBrowser/bonds/BondCard/BondCardInterestSection.tsx`
- Modify: `packages/web/src/components/BondReportsBrowser/bonds/BondCard/BondCardTradingSection.tsx`

- [ ] Add expanded content wrapper class in collapse sections for subtle surface differentiation.
- [ ] Tighten bond title link styling for better hierarchy.

### Task 5: Validate and smoke check

**Files:**
- Verify only

- [ ] Run targeted unit test(s).
- [ ] Run `npm run test -- packages/web/src/common/ColorCodes.test.ts`.
- [ ] Run `npm run build` (or explain if skipped).
- [ ] Summarize changed files and visual behavior deltas.
