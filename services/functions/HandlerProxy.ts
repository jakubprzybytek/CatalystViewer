import { APIGatewayProxyHandlerV2, APIGatewayProxyEventV2 } from "aws-lambda";

type LambdaResponse<T> = {
    data: T;
    statusCode: number;
}

type ErrorResponse = {
    message: string;
}

export type LambdaType<T> = (event: APIGatewayProxyEventV2) => Promise<LambdaResponse<T | ErrorResponse>>;

export const Success = <T>(data: T): LambdaResponse<T> => ({ data: data, statusCode: 200 });

export const Failure = (message: string): LambdaResponse<ErrorResponse> => ({ data: { message }, statusCode: 400 });

export const lambdaHandler = <T>(lambda: LambdaType<T>): APIGatewayProxyHandlerV2 => {
    return async function (event: APIGatewayProxyEventV2) {
        try {
            const response = await lambda(event);
            return {
                statusCode: response.statusCode,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(response.data),
            };
        } catch (e) {
            console.error(e);
            return {
                statusCode: 500,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: e
                }),
            };
        }
    };
};
