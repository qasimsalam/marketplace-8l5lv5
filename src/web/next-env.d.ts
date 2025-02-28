/// <reference types="next" />
/// <reference types="next/image-types/global" />

// NOTE: This file should not be edited
// see https://nextjs.org/docs/basic-features/typescript for more information.

declare namespace NodeJS {
  interface ProcessEnv {
    NEXT_PUBLIC_API_BASE_URL: string;
    NEXT_PUBLIC_AUTH0_DOMAIN: string;
    NEXT_PUBLIC_AUTH0_CLIENT_ID: string;
    NEXT_PUBLIC_AUTH0_AUDIENCE: string;
    NEXT_PUBLIC_STRIPE_PUBLIC_KEY: string;
    NEXT_PUBLIC_FEATURE_JUPYTER_NOTEBOOKS: string;
    NEXT_PUBLIC_FEATURE_AI_MATCHING: string;
    NEXT_PUBLIC_SOCKET_SERVER_URL: string;
  }
}