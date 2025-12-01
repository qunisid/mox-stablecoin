/// <reference types="vite/client" />

interface Window {
  ethereum?: {
    request: (args: { method: string; params?: any[] }) => Promise<any>;
    on: (event: string, callback: (...args: any[]) => void) => void;
    removeAllListeners: (event: string) => void;
  };
}

interface ImportMetaEnv {
  readonly VITE_DSC_ENGINE_ADDRESS: string;
  readonly VITE_DSC_TOKEN_ADDRESS: string;
  readonly VITE_WETH_ADDRESS: string;
  readonly VITE_WBTC_ADDRESS: string;
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
