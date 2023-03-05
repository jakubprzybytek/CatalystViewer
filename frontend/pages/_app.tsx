import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { Amplify, Auth, API } from "aws-amplify";

const amplifyConfig = {
  Auth: {
    region: process.env.NEXT_PUBLIC_AWS_REGION,
    userPoolId: process.env.NEXT_PUBLIC_USER_POOL_ID,
    userPoolWebClientId: process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID,
  },
  API: {
    endpoints: [
      {
        name: "api",
        endpoint: process.env.NEXT_PUBLIC_API_URL,
        region: process.env.NEXT_PUBLIC_AWS_REGION,
      },
    ],
  },
};

// console.log(Amplify.configure(amplifyConfig));
Auth.configure(amplifyConfig.Auth);
API.configure(amplifyConfig.API);

Auth.currentSession().then(a => console.log(a));

function MyApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />
}

export default MyApp;
