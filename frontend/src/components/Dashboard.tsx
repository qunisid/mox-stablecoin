import { useState, useEffect } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { formatUnits } from 'ethers';

export const Dashboard = () => {
  const { account, dscEngineContract, dscTokenContract, isConnected } = useWeb3();
  const [loading, setLoading] = useState(false);
  const [dscMinted, setDscMinted] = useState('0');
  const [collateralValue, setCollateralValue] = useState('0');
  const [healthFactor, setHealthFactor] = useState('0');
  const [dscBalance, setDscBalance] = useState('0');

  const fetchAccountData = async () => {
    if (!account || !dscEngineContract || !dscTokenContract) return;

    setLoading(true);
    try {
      const [minted, collateral] = await dscEngineContract.get_account_information(account);
      const health = await dscEngineContract.health_factor(account);
      const balance = await dscTokenContract.balanceOf(account);

      setDscMinted(formatUnits(minted, 18));
      setCollateralValue(formatUnits(collateral, 18));
      setHealthFactor(formatUnits(health, 18));
      setDscBalance(formatUnits(balance, 18));
    } catch (error) {
      console.error('Error fetching account data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected) {
      fetchAccountData();
      const interval = setInterval(fetchAccountData, 10000);
      return () => clearInterval(interval);
    }
  }, [account, isConnected]);

  if (!isConnected) {
    return (
      <div className="dashboard">
        <div className="connect-prompt">
          <h2>Welcome to DSC DApp</h2>
          <p>Connect your wallet to get started</p>
        </div>
      </div>
    );
  }

  const getHealthFactorColor = (hf: string) => {
    const value = parseFloat(hf);
    if (value >= 2) return 'health-good';
    if (value >= 1) return 'health-warning';
    return 'health-danger';
  };

  return (
    <div className="dashboard">
      <h2>Your Position</h2>

      {loading ? (
        <div className="loading">Loading...</div>
      ) : (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">DSC Minted</div>
            <div className="stat-value">{parseFloat(dscMinted).toFixed(2)} DSC</div>
          </div>

          <div className="stat-card">
            <div className="stat-label">Collateral Value</div>
            <div className="stat-value">${parseFloat(collateralValue).toFixed(2)}</div>
          </div>

          <div className="stat-card">
            <div className="stat-label">Health Factor</div>
            <div className={`stat-value ${getHealthFactorColor(healthFactor)}`}>
              {parseFloat(healthFactor).toFixed(2)}
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-label">DSC Balance</div>
            <div className="stat-value">{parseFloat(dscBalance).toFixed(2)} DSC</div>
          </div>
        </div>
      )}

      <button onClick={fetchAccountData} className="btn btn-secondary refresh-btn">
        Refresh Data
      </button>
    </div>
  );
};
