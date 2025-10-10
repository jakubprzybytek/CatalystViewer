import { use, StackContext, NextjsSite } from 'sst/constructs';
import { BondsService } from './BondsService';

export function Frontend({ stack }: StackContext) {
    const { api, auth } = use(BondsService);

    const customDomainPrefix = stack.stage === 'int' ? '' : stack.stage + '.';

    const site = new NextjsSite(stack, 'Site', {
        path: 'packages/web',
        customDomain: {
            hostedZone: 'albedoonline.com',
            domainName: customDomainPrefix + 'catalyst.albedoonline.com',
        },
        environment: {
            NEXT_PUBLIC_AWS_REGION: stack.region,
            NEXT_PUBLIC_API_URL: 'https://670byq6ieh.execute-api.eu-west-1.amazonaws.com',
            NEXT_PUBLIC_USER_POOL_ID: auth.userPoolId,
            NEXT_PUBLIC_USER_POOL_CLIENT_ID: auth.userPoolClientId,
        },
    });

    stack.addOutputs({
        SiteUrl: site.url || 'http://localhost:3000',
        SiteCustomDomainUrl: site.customDomainUrl || 'n/a',
        ApiUrl: api.customDomainUrl || api.url,
    });
}
