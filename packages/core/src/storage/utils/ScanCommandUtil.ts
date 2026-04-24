import { DynamoDBDocumentClient, ScanCommand, ScanCommandOutput } from '@aws-sdk/lib-dynamodb';

export const scanAll = async (dynamoDBDocumentClient: DynamoDBDocumentClient, scanCommand: ScanCommand): Promise<ScanCommandOutput> => {
    const result = await dynamoDBDocumentClient.send(scanCommand);
    let lastEvaluatedKey = result.LastEvaluatedKey;
    while (lastEvaluatedKey && Object.keys(lastEvaluatedKey).length !== 0 && !scanCommand.input.Limit) {
        scanCommand.input.ExclusiveStartKey = lastEvaluatedKey;
        const newResult = await dynamoDBDocumentClient.send(scanCommand);
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
