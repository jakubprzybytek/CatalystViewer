/**
 * Dry-run test of issuer classification logic.
 * Demonstrates the prompt, JSON parsing, and error handling without calling real Bedrock.
 */

const INDUSTRY_LABELS = [
    'Developer',
    'Finance',
    'Health Services',
    'Energy',
    'Retail',
    'Manufacturing',
    'Municipal',
    'Other',
] as const;

type Industry = typeof INDUSTRY_LABELS[number];

type ClassificationResponse = {
    industry: Industry;
    businessSummary: string;
};

function buildPrompt(issuerName: string): string {
    return `You are a financial analyst. Classify the following company that issues bonds on the Polish Catalyst bond market.

Company name: "${issuerName}"

Respond with a JSON object only, no markdown, no explanation. Use this exact structure:
{
  "industry": "<one of: ${INDUSTRY_LABELS.join(' | ')}>",
  "businessSummary": "<2-3 sentences in English describing the company's main business activity>"
}`;
}

function parseClassificationResponse(text: string): ClassificationResponse {
    const parsed = JSON.parse(text.trim()) as unknown;
    if (
        typeof parsed !== 'object' ||
        parsed === null ||
        !('industry' in parsed) ||
        !('businessSummary' in parsed) ||
        typeof (parsed as Record<string, unknown>).industry !== 'string' ||
        typeof (parsed as Record<string, unknown>).businessSummary !== 'string'
    ) {
        throw new Error('InvalidResponseFormat: missing or wrong-typed fields');
    }
    const { industry, businessSummary } = parsed as { industry: string; businessSummary: string };
    if (!(INDUSTRY_LABELS as readonly string[]).includes(industry)) {
        throw new Error(`InvalidResponseFormat: unknown industry label "${industry}"`);
    }
    return { industry: industry as Industry, businessSummary };
}

// ============ TEST CASES ============

console.log('\n=== DRY-RUN TEST: Issuer Classification Logic ===\n');

// Test 1: Valid response
console.log('Test 1: Valid Bedrock response for Kruk S.A.');
console.log('---');
try {
    const krukResponse = `{
  "industry": "Finance",
  "businessSummary": "Kruk S.A. is a leading debt collection and financial services company in Central Europe. The company specializes in purchasing, managing, and collecting non-performing loans across consumer and corporate segments. Kruk operates primarily in Poland, Czech Republic, and other Central European markets."
}`;
    const result = parseClassificationResponse(krukResponse);
    console.log('✓ Parsed successfully:');
    console.log(JSON.stringify(result, null, 2));
} catch (error) {
    console.error('✗ Failed:', error);
}

// Test 2: Invalid industry label
console.log('\n\nTest 2: Invalid industry label (should fail)');
console.log('---');
try {
    const invalidResponse = `{
  "industry": "InvalidIndustry",
  "businessSummary": "Some company description"
}`;
    parseClassificationResponse(invalidResponse);
    console.error('✗ Should have thrown error');
} catch (error) {
    console.log('✓ Correctly rejected:', (error as Error).message);
}

// Test 3: Malformed JSON
console.log('\n\nTest 3: Malformed JSON (should fail)');
console.log('---');
try {
    const malformedResponse = `{
  "industry": "Finance"
  // Missing businessSummary
}`;
    parseClassificationResponse(malformedResponse);
    console.error('✗ Should have thrown error');
} catch (error) {
    console.log('✓ Correctly rejected:', (error as Error).message);
}

// Test 4: Missing field
console.log('\n\nTest 4: Missing required field (should fail)');
console.log('---');
try {
    const missingFieldResponse = `{
  "industry": "Manufacturing"
}`;
    parseClassificationResponse(missingFieldResponse);
    console.error('✗ Should have thrown error');
} catch (error) {
    console.log('✓ Correctly rejected:', (error as Error).message);
}

// Test 5: Sample prompt for reference
console.log('\n\nTest 5: Generated prompt for classification');
console.log('---');
const samplePrompt = buildPrompt('Kruk S.A.');
console.log(samplePrompt);

// Test 6: Test with other Polish companies
console.log('\n\nTest 6: Valid response for PKO BP');
console.log('---');
try {
    const pkoBpResponse = `{
  "industry": "Finance",
  "businessSummary": "PKO Bank Polski S.A. is Poland's largest financial institution and primary commercial bank. It provides comprehensive banking services including retail, corporate, and investment banking to millions of customers across Poland."
}`;
    const result = parseClassificationResponse(pkoBpResponse);
    console.log('✓ Parsed successfully:');
    console.log(JSON.stringify(result, null, 2));
} catch (error) {
    console.error('✗ Failed:', error);
}

console.log('\n\n=== All tests completed ===\n');
