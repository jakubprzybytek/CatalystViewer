# Issuer Classification Test Scripts

Tests for the Bedrock-based issuer classification functionality.

## Setup

```bash
cd scripts/test-issuer-classification
pnpm install
```

## Test Scripts

### Dry-run test (no AWS call)

Tests the classification logic, JSON parsing, and error handling without requiring Bedrock access.

```bash
pnpm tsx test-classification-dry-run.ts
```

**What it does:**
- Validates prompt generation
- Tests JSON parsing with valid responses
- Tests error handling with invalid/malformed responses
- Tests with example Polish companies (Kruk S.A., PKO BP)

**Output:** All parsing logic tests ✓

### Live Bedrock test

Makes real calls to AWS Bedrock to classify an issuer. Requires AWS credentials and Bedrock API access.

```bash
pnpm test
```

**Requirements:**
- AWS credentials configured locally (`~/.aws/credentials` or environment variables)
- Bedrock API access in your AWS region
- Claude Haiku model available
- Network access to AWS

**Cost Note:** Each test incurs a small charge (~$0.0001 per call).

## Model ID Configuration

The live test uses the model ID specified in `test-classification.ts`. If you get an error like "The provided model identifier is invalid", check:

1. **Region support**: Not all AWS regions have Bedrock Claude Haiku models
2. **Cross-region inference**: Update model ID to `us.anthropic.claude-haiku-4-5-20251001-v1:0`
3. **Model availability**: Run in us-east-1, us-west-2, or other supported regions

## Example: Kruk S.A. Classification

**Input:** Kruk S.A. (Polish debt collection and financial services company)

**Expected output:**
```json
{
  "industry": "Finance",
  "businessSummary": "Kruk S.A. is a leading debt collection and financial services company in Central Europe. The company specializes in purchasing, managing, and collecting non-performing loans..."
}
```

See `test-classification-dry-run.ts` for live demo of the parsing logic.

