interface ImportMetaEnv {
  VITE_NETLIFY_PAT: string;
  // add other VITE_ variables here if needed
  readonly VITE_API_URL: string;
  readonly VITE_GOOGLE_CLIENT_ID: string;
  readonly VITE_PAYMENT_ENCRYPTION_KEY: string;
  readonly VITE_GITHUB_PAT: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}