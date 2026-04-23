import '../styles/globals.css';
import React from 'react';
import type { AppProps } from 'next/app';
import localFont from 'next/font/local';
import { Amplify } from "aws-amplify";

const roboto = localFont({
  display: 'swap',
  src: [
    { path: '../public/fonts/roboto/roboto-latin-300-normal.woff2', weight: '300', style: 'normal' },
    { path: '../public/fonts/roboto/roboto-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: '../public/fonts/roboto/roboto-latin-500-normal.woff2', weight: '500', style: 'normal' },
    { path: '../public/fonts/roboto/roboto-latin-700-normal.woff2', weight: '700', style: 'normal' },
  ],
});

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
  const Page = Component as React.ComponentType<typeof pageProps>;
  return <Page className={roboto.className} {...pageProps} />;
}
