import { DynamoDBDocumentClient, QueryCommand, QueryCommandOutput } from '@aws-sdk/lib-dynamodb';

export const queryAll = async (dynamoDBDocumentClient: DynamoDBDocumentClient, queryCommand: QueryCommand): Promise<QueryCommandOutput> => {
    const result = await dynamoDBDocumentClient.send(queryCommand);
    let lastEvaluatedKey = result.LastEvaluatedKey;
    while (lastEvaluatedKey && Object.keys(lastEvaluatedKey).length !== 0 && !queryCommand.input.Limit) {
        queryCommand.input.ExclusiveStartKey = lastEvaluatedKey;
        const newResult = await dynamoDBDocumentClient.send(queryCommand);
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
