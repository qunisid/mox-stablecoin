import { useWeb3 } from '../context/Web3Context';

export const Header = () => {
  const { account, isConnected, connectWallet, disconnectWallet, chainId } = useWeb3();

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getChainName = (id: number | null) => {
    if (!id) return '';
    const chains: Record<number, string> = {
      31337: 'Anvil',
      11155111: 'Sepolia',
      300: 'zkSync Sepolia',
    };
    return chains[id] || `Chain ${id}`;
  };

  return (
    <header className="header">
      <div className="header-content">
        <div className="logo">
          <h1>DSC DApp</h1>
          <span className="subtitle">Decentralized Stablecoin</span>
        </div>

        <div className="header-actions">
          {isConnected && chainId && (
            <div className="chain-badge">{getChainName(chainId)}</div>
          )}

          {isConnected ? (
            <div className="account-info">
              <span className="account-address">{formatAddress(account!)}</span>
              <button onClick={disconnectWallet} className="btn btn-secondary">
                Disconnect
              </button>
            </div>
          ) : (
            <button onClick={connectWallet} className="btn btn-primary">
              Connect Wallet
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
