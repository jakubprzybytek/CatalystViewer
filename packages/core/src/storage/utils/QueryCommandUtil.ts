import { DynamoDBClient, QueryCommand, QueryCommandOutput } from '@aws-sdk/client-dynamodb';

export const queryAll = async (dynamoDBClient: DynamoDBClient, queryCommand: QueryCommand): Promise<QueryCommandOutput> => {
    const result = await dynamoDBClient.send(queryCommand);
    let lastEvaluatedKey = result.LastEvaluatedKey;
    while (lastEvaluatedKey && Object.keys(lastEvaluatedKey).length !== 0 && !queryCommand.input.Limit) {
        queryCommand.input.ExclusiveStartKey = lastEvaluatedKey;
        const newResult = await dynamoDBClient.send(queryCommand);
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
