import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { Resource } from 'sst';
import { BondDetailsTable } from '@core/storage/bondDetails';
import { IssuerProfilesTable } from '@core/storage/issuerProfiles';
import { UpdateBondsResult } from '../bonds';
import { ClassificationConfig, CollectIssuersResult } from '.';

const dynamoDbClient = new DynamoDBClient({});

export async function handler(input: UpdateBondsResult & ClassificationConfig): Promise<CollectIssuersResult> {
    const bondDetailsTable = new BondDetailsTable(dynamoDbClient, Resource.BondDetails.name);
    const issuerProfilesTable = new IssuerProfilesTable(dynamoDbClient, Resource.IssuerProfiles.name);

    const [activeBonds, existingProfiles] = await Promise.all([
        bondDetailsTable.getAllActive(),
        issuerProfilesTable.getAll(),
    ]);

    const allIssuers = [...new Set(activeBonds.map(b => b.issuer))];

    if (input.forceClassification) {
        console.log(`CollectUnclassifiedIssuers: forceClassification=true, returning all ${allIssuers.length} issuers`);
        return {
            ...input,
            unclassifiedIssuers: allIssuers,
        };
    }

    const classifiedIssuers = new Set(existingProfiles.map(p => p.issuerName));
    const unclassifiedIssuers = allIssuers.filter(issuer => !classifiedIssuers.has(issuer));

    console.log(`CollectUnclassifiedIssuers: ${allIssuers.length} total issuers, ${classifiedIssuers.size} already classified, ${unclassifiedIssuers.length} to classify`);

    return {
        ...input,
        unclassifiedIssuers,
    };
}
