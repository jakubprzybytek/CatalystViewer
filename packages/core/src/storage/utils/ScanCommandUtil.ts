import { DynamoDBClient, ScanCommand, ScanCommandOutput } from '@aws-sdk/client-dynamodb';

export const scanAll = async (dynamoDBClient: DynamoDBClient, scanCommand: ScanCommand): Promise<ScanCommandOutput> => {
    const result = await dynamoDBClient.send(scanCommand);
    let lastEvaluatedKey = result.LastEvaluatedKey;
    while (lastEvaluatedKey && Object.keys(lastEvaluatedKey).length !== 0 && !scanCommand.input.Limit) {
        scanCommand.input.ExclusiveStartKey = lastEvaluatedKey;
        const newResult = await dynamoDBClient.send(scanCommand);
        lastEvaluatedKey = newResult.LastEvaluatedKey;
        if (newResult.Items) {
            if (!result.Items) {
                result.Items = newResult.Items;
            } else {
                result.Items = result.Items.concat(newResult.Items);
            }
        }
    }
    return result;
};
