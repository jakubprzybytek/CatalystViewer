import { APIGatewayProxyHandlerV2, APIGatewayProxyEventV2 } from "aws-lambda";
import { gzipSync } from 'zlib';

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
            const body = JSON.stringify(response.data);
            const gzippedBody = gzipSync(body);
            return {
                isBase64Encoded: true,
                statusCode: response.statusCode,
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Encoding': 'gzip'
                },
                body: gzippedBody.toString('base64'),
            };
        } catch (e) {
            console.error(e);
            return {
                statusCode: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Encoding': 'none'
                },
                body: JSON.stringify({
                    message: e
                }),
            };
        }
    };
};
