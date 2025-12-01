import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { BrowserProvider, Contract } from 'ethers';
import DSCEngineABI from '../contracts/DSCEngineABI.json';
import ERC20ABI from '../contracts/ERC20ABI.json';
import { CONTRACTS } from '../config';

interface Web3ContextType {
  provider: BrowserProvider | null;
  account: string | null;
  dscEngineContract: Contract | null;
  dscTokenContract: Contract | null;
  wethContract: Contract | null;
  wbtcContract: Contract | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  isConnected: boolean;
  chainId: number | null;
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
};

interface Web3ProviderProps {
  children: ReactNode;
}

export const Web3Provider = ({ children }: Web3ProviderProps) => {
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [dscEngineContract, setDscEngineContract] = useState<Contract | null>(null);
  const [dscTokenContract, setDscTokenContract] = useState<Contract | null>(null);
  const [wethContract, setWethContract] = useState<Contract | null>(null);
  const [wbtcContract, setWbtcContract] = useState<Contract | null>(null);

  const connectWallet = async () => {
    if (typeof window.ethereum === 'undefined') {
      alert('Please install MetaMask to use this dApp!');
      return;
    }

    try {
      const ethereumProvider = new BrowserProvider(window.ethereum);
      const accounts = await ethereumProvider.send('eth_requestAccounts', []);
      const network = await ethereumProvider.getNetwork();

      setProvider(ethereumProvider);
      setAccount(accounts[0]);
      setChainId(Number(network.chainId));

      const signer = await ethereumProvider.getSigner();

      const dscEngine = new Contract(CONTRACTS.DSC_ENGINE, DSCEngineABI, signer);
      const dscToken = new Contract(CONTRACTS.DSC_TOKEN, ERC20ABI, signer);
      const weth = new Contract(CONTRACTS.WETH, ERC20ABI, signer);
      const wbtc = new Contract(CONTRACTS.WBTC, ERC20ABI, signer);

      setDscEngineContract(dscEngine);
      setDscTokenContract(dscToken);
      setWethContract(weth);
      setWbtcContract(wbtc);

    } catch (error) {
      console.error('Error connecting wallet:', error);
      alert('Failed to connect wallet. Please try again.');
    }
  };

  const disconnectWallet = () => {
    setProvider(null);
    setAccount(null);
    setChainId(null);
    setDscEngineContract(null);
    setDscTokenContract(null);
    setWethContract(null);
    setWbtcContract(null);
  };

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length === 0) {
          disconnectWallet();
        } else {
          setAccount(accounts[0]);
        }
      });

      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeAllListeners('accountsChanged');
        window.ethereum.removeAllListeners('chainChanged');
      }
    };
  }, []);

  const value = {
    provider,
    account,
    dscEngineContract,
    dscTokenContract,
    wethContract,
    wbtcContract,
    connectWallet,
    disconnectWallet,
    isConnected: !!account,
    chainId,
  };

  return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>;
};
