import { use, StackContext, NextjsSite } from '@serverless-stack/resources';
import { BondsService } from './BondsService';

export function Frontend({ stack }: StackContext) {
    const { api } = use(BondsService);

    const customDomainPrefix = stack.stage === 'int' ? '' : stack.stage + '.';

    const site = new NextjsSite(stack, 'Site', {
        path: 'frontend',
        customDomain: {
            hostedZone: 'albedoonline.com',
            domainName: customDomainPrefix + 'catalyst.albedoonline.com',
        },
        environment: {
            NEXT_PUBLIC_AWS_REGION: stack.region,
            NEXT_PUBLIC_API_URL: api.customDomainUrl || api.url,
        },
    });

    // Show the site URL in the output
    stack.addOutputs({
        URL: site.url,
        CustomDomainURL: site.customDomainUrl || 'n/a'
    });
}
