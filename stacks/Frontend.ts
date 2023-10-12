import { use, StackContext, NextjsSite, Api } from 'sst/constructs';
import { BondsService } from './BondsService';

export function Frontend({ stack }: StackContext) {
    const { api, auth, apiUrl } = use(BondsService);

    const customDomainPrefix = stack.stage === 'int' ? '' : stack.stage + '.';

    const api2 = new Api(stack, "api2", {
        routes: {
          'GET /time': 'hello/world', 
        }
      });

    const site = new NextjsSite(stack, 'Site', {
        path: 'packages/web',
        // customDomain: {
        //     hostedZone: 'albedoonline.com',
        //     domainName: customDomainPrefix + 'catalyst.albedoonline.com',
        // },
        // environment: {
        //     NEXT_PUBLIC_AWS_REGION: stack.region,
        //     NEXT_PUBLIC_API_URL: api.url,
        //     NEXT_PUBLIC_HELLO: apiUrl,
        //     NEXT_PUBLIC_API_URL2: 'hello',
        //     NEXT_PUBLIC_USER_POOL_ID: auth.userPoolId,
        //     NEXT_PUBLIC_USER_POOL_CLIENT_ID: auth.userPoolClientId,
        // },
        bind: [api2, auth]
    });

    // Show the site URL in the output
    stack.addOutputs({
        API_URK: api.url,
        URL: site.url || 'http://localhost:3000',
        CustomDomainURL: site.customDomainUrl || 'n/a'
    });
}
