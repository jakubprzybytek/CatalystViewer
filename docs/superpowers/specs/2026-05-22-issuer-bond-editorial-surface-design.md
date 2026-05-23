# Issuer and Bond Views Editorial Surface Refresh — Design

**Date:** 2026-05-22  
**Status:** Draft

## Overview

Both issuer and bond views currently render white cards on a near-white page surface, which weakens hierarchy and reduces perceived polish. This design introduces an editorial visual system focused on surface contrast, typography hierarchy, and subtle motion, while preserving the current information architecture and interaction model.

The chosen direction is **Editorial Intelligence**:
- calm and premium, not flashy
- clear card-to-canvas separation
- stronger reading flow for dense financial data

## Goals

1. Remove white-on-white visual blending between page and cards.
2. Increase scanability of issuer and bond cards without changing data semantics.
3. Preserve existing workflows, filters, sorting, and responsive behavior.
4. Improve perceived quality with restrained motion and stronger typographic rhythm.

## Non-Goals

1. No changes to backend APIs, data contracts, or filtering logic.
2. No reordering of major information blocks in cards.
3. No dark mode in this phase.

## Visual System

### Surface tokens

Introduce CSS variables in global styles to create explicit page and card layers:

```css
:root {
  --cv-bg-page-top: #f4f6f8;
  --cv-bg-page-bottom: #e9edf2;
  --cv-bg-card: #fffdf8;
  --cv-bg-card-subtle: #f8f5ee;
  --cv-border-soft: #d6dde7;
  --cv-border-strong: #c2ccd9;
  --cv-text-primary: #1a2433;
  --cv-text-secondary: #4f6075;
  --cv-text-muted: #6f8096;
  --cv-accent-selection: #2f6db3;
  --cv-shadow-card: 0 2px 10px rgba(29, 42, 58, 0.08);
  --cv-shadow-card-hover: 0 8px 24px rgba(29, 42, 58, 0.12);
}
```

### Page surface

Replace flat background with a soft gradient canvas:

```css
body {
  background: linear-gradient(180deg, var(--cv-bg-page-top) 0%, var(--cv-bg-page-bottom) 100%);
}
```

### Typography

Keep current font family for now, but tighten hierarchy:
- card title (`h6`): stronger weight and slightly tighter letter spacing
- caption text: use `--cv-text-secondary` instead of generic gray
- tiny meta text: use `--cv-text-muted`, avoid very low-contrast lightgray

## Component Design

### Issuer cards

Target file: `packages/web/src/components/BondReportsBrowser/issuers/IssuerCard.tsx`

1. Card container
- set card background to `--cv-bg-card`
- add soft border and shadow
- keep outline variant compatibility

2. Selected state
- replace full oldlace fill with:
  - thin left accent bar (`4px`) in `--cv-accent-selection`
  - subtle ring/border emphasis
- this keeps readability and avoids broad warm color flooding

3. Expanded section
- add a divider above expanded content
- expanded area sits on `--cv-bg-card-subtle` with rounded inner corners

4. Industry chip harmonization
- keep per-industry mapping but reduce saturation 10-20% to fit editorial tone

### Bond cards

Target file: `packages/web/src/components/BondReportsBrowser/bonds/BondCard/index.tsx` and related section files

1. Card container
- same card surface rules as issuers for visual consistency

2. Section separators
- replace separators tied to old background variable with `--cv-border-soft`
- increase contrast slightly for clearer structural parsing

3. Value badges
- current `white` color marker blends with card surface
- replace the `white` marker with a tinted neutral badge (e.g. `#eef2f7`) and dark text
- keep semantic badges (`green/yellow/orange/red`) unchanged in meaning

4. Expanded state clarity
- expanded blocks get a subtle tinted backdrop to differentiate from collapsed summary rows

### Shared card primitives

Target file: `packages/web/src/common/Cards/CardEntry.tsx` and `packages/web/src/common/ColorCodes.tsx`

1. Update `white` color marker to neutral-tinted background with soft border.
2. Ensure caption text color uses global text token and not browser gray defaults.
3. Preserve API of `CardValue` and `CardEntry` to avoid broad refactors.

## Motion and Interaction

1. Card hover (pointer devices only)
- transition: transform + shadow (`180-220ms`, ease-out)
- effect: translateY(-1px) and stronger card shadow

2. Entry animation
- on list render, apply subtle fade-up stagger for first visible cards only
- no continuous animation

3. Expand/collapse
- use existing collapse behavior, add slight opacity transition in expanded content container

## Accessibility

1. Ensure text contrast for captions and tiny metadata is at least WCAG AA for normal text where possible.
2. Selected issuer state must not rely on color alone:
- keep checkbox and selected accent bar together
3. Hover effects must not be required for understanding.
4. Keep current keyboard and screen-reader behavior unchanged.

## Responsive Behavior

1. Mobile
- reduce shadow intensity and background tint strength
- preserve current grid sizes and list structure

2. Desktop
- stronger depth and hover polish enabled

## Implementation Scope

### Files expected to change

1. `packages/web/styles/globals.css`
2. `packages/web/src/components/BondReportsBrowser/issuers/IssuerCard.tsx`
3. `packages/web/src/components/BondReportsBrowser/bonds/BondCard/index.tsx`
4. `packages/web/src/components/BondReportsBrowser/bonds/BondCard/BondCardDetailsSection.tsx`
5. `packages/web/src/common/ColorCodes.tsx`
6. `packages/web/src/common/Cards/CardEntry.tsx`

## Risks and Mitigations

1. Risk: visual regression across dialogs and secondary sections.
- Mitigation: scope variables/classes to cards and browser view containers first.

2. Risk: too little differentiation after rollout.
- Mitigation: adjust only token values (not structure) in one iteration pass.

3. Risk: badge readability on tinted backgrounds.
- Mitigation: check each color marker against card backgrounds and tweak border/text contrast.

## Testing Strategy

1. Manual visual checks
- Issuers view: normal, selected, expanded, with and without scorecard
- Bonds view: collapsed, expanded, all key badge types
- Mobile breakpoints: `xs`, `sm`

2. Functional regression checks
- filter drawer behavior unchanged
- issuer checkbox selection unchanged
- bond expand/collapse unchanged

3. Optional visual snapshot follow-up
- add Playwright screenshots for issuer and bond list states if visual drift needs ongoing guardrails

## Rollout Plan

1. Introduce surface tokens and global card surface updates.
2. Apply issuer card selected/expanded refinements.
3. Apply bond card separators and neutral badge update.
4. Tune token values after first visual pass.

## Acceptance Criteria

1. Cards are clearly separated from page background in both views.
2. White badges no longer visually merge with card surfaces.
3. Selected issuers remain obvious without full-card fill color.
4. No behavior regressions in filtering, sorting, or card expansion.
5. Visual style reads as editorial and premium, not generic dashboard gray.
