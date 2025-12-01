export const CONTRACTS = {
  DSC_ENGINE: import.meta.env.VITE_DSC_ENGINE_ADDRESS || '',
  DSC_TOKEN: import.meta.env.VITE_DSC_TOKEN_ADDRESS || '',
  WETH: import.meta.env.VITE_WETH_ADDRESS || '',
  WBTC: import.meta.env.VITE_WBTC_ADDRESS || '',
};

export const SUPPORTED_CHAINS = {
  ANVIL: 31337,
  SEPOLIA: 11155111,
  ZKSYNC_SEPOLIA: 300,
};

export const COLLATERAL_TOKENS = [
  {
    address: CONTRACTS.WETH,
    symbol: 'WETH',
    name: 'Wrapped Ether',
    decimals: 18,
  },
  {
    address: CONTRACTS.WBTC,
    symbol: 'WBTC',
    name: 'Wrapped Bitcoin',
    decimals: 18,
  },
];

export const MIN_HEALTH_FACTOR = 1;
export const LIQUIDATION_THRESHOLD = 50;
export const LIQUIDATION_PRECISION = 100;
