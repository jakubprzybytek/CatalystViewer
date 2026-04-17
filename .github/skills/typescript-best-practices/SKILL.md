---
name: typescript-best-practices
description: '**WORKFLOW SKILL** — Enforce TypeScript best practices in the codebase, including strict type checking, proper module structure, and dependency management. USE FOR: reviewing TypeScript code for best practices; suggesting improvements to type safety; ensuring consistent coding standards; validating package.json for strict versioning. DO NOT USE FOR: general coding questions; runtime debugging; non-TypeScript related tasks. INVOKES: file system tools for reading/writing TypeScript files and package.json; grep_search for finding patterns; run_in_terminal for type checking.'
---

# TypeScript Best Practices Skill

## Overview

This skill enforces TypeScript best practices to ensure type safety, maintainability, and consistency in the codebase. It includes rules for strict type checking, module organization, and dependency management.

## Key Rules

### 1. Strict Type Checking
- Always enable `strict: true` in `tsconfig.json`
- Use `noImplicitAny: true` to prevent implicit `any` types
- Enable `strictNullChecks` to catch null/undefined errors
- Use `exactOptionalPropertyTypes` for precise optional property handling

### 2. Package.json Strict Versioning
- **Always use strict versions** in `package.json` dependencies (e.g., `"1.2.3"` instead of `"^1.2.3"` or `"~1.2.3"`)
- This ensures reproducible builds and prevents unexpected breaking changes
- Apply to both `dependencies` and `devDependencies`

### 3. Type Definitions
- Prefer explicit types over inferred types for public APIs
- Use union types and discriminated unions for better type safety
- Avoid `any` type; use `unknown` when type is truly unknown
- Leverage utility types like `Partial<T>`, `Pick<T>`, `Omit<T>`

### 4. Module Organization
- Use ES6 modules with explicit imports/exports
- Avoid namespace pollution with proper export patterns
- Group related types and functions in logical modules

### 5. Error Handling
- Use custom error classes extending `Error`
- Prefer throwing exceptions over returning error codes
- Use `never` type for exhaustive checks in switch statements

### 6. Async Programming
- Prefer `async/await` over Promises for readability
- Use `Promise.all()` for concurrent operations
- Handle promise rejections properly

## Implementation Guidelines

When applying this skill:

1. **Review tsconfig.json**: Ensure strict mode is enabled with all recommended flags
2. **Audit package.json**: Check all dependency versions are strict (no `^` or `~` prefixes)
3. **Code Analysis**: Scan TypeScript files for `any` usage, implicit types, and other anti-patterns
4. **Suggestions**: Provide specific code examples for improvements
5. **Validation**: Run `tsc --noEmit` to verify type checking passes

## Common Anti-patterns to Avoid

- Using `any` type unnecessarily
- Implicit `any` in function parameters
- Loose dependency versioning
- Ignoring TypeScript compiler warnings
- Overusing type assertions (`as` keyword)

## Tools and Commands

- `tsc --noEmit` for type checking without emitting files
- `tsc --strict` to enable all strict checks
- ESLint with TypeScript rules for additional linting
- Prettier for consistent code formatting

## Examples

### Strict package.json versioning:
```json
{
  "dependencies": {
    "react": "18.2.0",
    "typescript": "5.0.4"
  }
}
```

### Proper type definitions:
```typescript
interface User {
  id: number;
  name: string;
  email?: string; // Use exact optional types
}

function createUser(data: Partial<User>): User {
  // Implementation
}
```

This skill helps maintain high-quality, type-safe TypeScript codebases with reproducible dependencies.