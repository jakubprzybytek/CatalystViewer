import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { Amplify } from "aws-amplify";

const amplifyConfig = {
  Auth: {
    Cognito: {
      userPoolId: process.env.NEXT_PUBLIC_USER_POOL_ID!,
      userPoolClientId: process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID!,
    },
  },
  API: {
    REST: {
      api: {
        endpoint: process.env.NEXT_PUBLIC_API_URL!,
        region: process.env.NEXT_PUBLIC_AWS_REGION,
      },
    },
  },
};

console.log(`region: ${process.env.NEXT_PUBLIC_AWS_REGION}`)
console.log(`api url: ${process.env.NEXT_PUBLIC_API_URL}`)
console.log(`pool id: ${process.env.NEXT_PUBLIC_USER_POOL_ID}`)

Amplify.configure(amplifyConfig);

export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />
}
