import { StackContext, Api, Table } from "@serverless-stack/resources";

export function MyStack({ stack }: StackContext) {

  new Table(stack, 'BondDetails', {
    fields: {
      name: 'string',
      market: 'string',
      'name#market': 'string',
      issuer: 'string',
      type: 'string',
      nominalValue: 'number',
      maturityDay: 'string',
      currentInterestRate: 'number',
      accuredInterest: 'number'
    },
    primaryIndex: {
      partitionKey: 'issuer',
      sortKey: 'name#market'
    }
  });

  const api = new Api(stack, "api", {
    routes: {
      "GET /": "functions/lambda.handler",
    },
  });
  stack.addOutputs({
    ApiEndpoint: api.url
  });
}
