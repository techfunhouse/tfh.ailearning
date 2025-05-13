/// <reference types="vite/client" />

interface ImportMeta {
  readonly env: {
    readonly VITE_API_URL?: string;
    readonly VITE_GITHUB_PAGES?: string;
    readonly VITE_BASE_PATH?: string;
    readonly VITE_USE_CUSTOM_DOMAIN?: string;
    readonly MODE: string;
    readonly DEV: boolean;
    readonly PROD: boolean;
    readonly SSR: boolean;
    [key: string]: string | boolean | undefined;
  };
}