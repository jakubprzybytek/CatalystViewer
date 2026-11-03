import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { Context } from 'aws-lambda';
import { Logger } from '@aws-lambda-powertools/logger';
import { Resource } from 'sst';
import { BondDetailsTable } from '@core/storage/bondDetails';
import { IssuerProfilesTable } from '@core/storage/issuerProfiles';
import { gleifClient, resolveIdentity, type Gleif } from '@core/bonds/issuers/identity';
import type { IdentitySummary, ResolveIdentityInput } from '.';

const logger = new Logger({ serviceName: 'ResolveIssuerIdentity' });

const dynamoDbClient = new DynamoDBClient({});

// Step of the Bonds Updater, after an issuer's classification: finds its company in the LEI register
// (GLEIF) from its active bonds' ISINs or its name, and stores it as its #IDENTITY row. A name that
// already has one is left as it is (identities set or confirmed by hand stay).
export async function resolveIssuerIdentity(
    issuerName: string,
    deps: { profiles: Pick<IssuerProfilesTable, 'getIdentity' | 'storeIdentity'>; isins: () => Promise<string[]>; gleif: Gleif; now?: Date },
): Promise<IdentitySummary> {
    const existing = await deps.profiles.getIdentity(issuerName);
    if (existing) return { found: true, existing: true, legalName: existing.legalName, entityId: existing.entityId, status: existing.status };
    const outcome = await resolveIdentity(issuerName, await deps.isins(), deps.gleif, deps.now ?? new Date());
    if (!outcome.found) return { found: false, reason: outcome.reason };
    await deps.profiles.storeIdentity(outcome.record);
    const { record } = outcome;
    return { found: true, existing: false, legalName: record.legalName, entityId: record.entityId, status: record.status, ...(record.note ? { note: record.note } : {}) };
}

export async function handler(input: ResolveIdentityInput, context: Context): Promise<IdentitySummary> {
    logger.addContext(context);
    const { issuerName } = input;
    const summary = await resolveIssuerIdentity(issuerName, {
        profiles: new IssuerProfilesTable(dynamoDbClient, Resource.IssuerProfiles.name),
        isins: async () => [...new Set((await new BondDetailsTable(dynamoDbClient, Resource.BondDetails.name).getAllActive())
            .filter(b => b.issuer === issuerName).map(b => b.isin).filter(Boolean))],
        gleif: gleifClient(),
    });
    logger.info('Issuer identity', { issuerName, ...summary });
    return summary;
}
