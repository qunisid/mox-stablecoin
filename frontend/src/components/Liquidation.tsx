import { useState } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { parseUnits, formatUnits } from 'ethers';
import { COLLATERAL_TOKENS, CONTRACTS } from '../config';
import { supabase } from '../lib/supabase';

export const Liquidation = () => {
  const { account, dscEngineContract, isConnected } = useWeb3();
  const [selectedToken, setSelectedToken] = useState(COLLATERAL_TOKENS[0].symbol);
  const [userAddress, setUserAddress] = useState('');
  const [debtAmount, setDebtAmount] = useState('');
  const [healthFactor, setHealthFactor] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState('');

  const checkHealthFactor = async () => {
    if (!dscEngineContract || !userAddress) {
      setStatus('Please enter a user address');
      return;
    }

    setChecking(true);
    try {
      const hf = await dscEngineContract.health_factor(userAddress);
      const hfFormatted = formatUnits(hf, 18);
      setHealthFactor(hfFormatted);

      if (parseFloat(hfFormatted) >= 1) {
        setStatus('User is healthy and cannot be liquidated.');
      } else {
        setStatus('User is undercollateralized and can be liquidated!');
      }
    } catch (error: any) {
      console.error('Error checking health factor:', error);
      setStatus(`Error: ${error.message || 'Failed to check health factor'}`);
    } finally {
      setChecking(false);
    }
  };

  const handleLiquidate = async () => {
    if (!account || !dscEngineContract || !userAddress || !debtAmount) {
      setStatus('Please fill in all fields');
      return;
    }

    if (parseFloat(healthFactor) >= 1) {
      setStatus('Cannot liquidate a healthy position');
      return;
    }

    setLoading(true);
    setStatus('Liquidating position...');

    try {
      const tokenAddress = selectedToken === 'WETH' ? CONTRACTS.WETH : CONTRACTS.WBTC;
      const amountWei = parseUnits(debtAmount, 18);

      const tx = await dscEngineContract.liquidate(tokenAddress, userAddress, amountWei);
      const receipt = await tx.wait();

      setStatus('Success! Position liquidated. You received bonus collateral.');
      setUserAddress('');
      setDebtAmount('');
      setHealthFactor('');

      if (supabase) {
        await supabase.from('transactions').insert({
          user_address: account,
          transaction_type: 'liquidation',
          token: selectedToken,
          amount: debtAmount,
          metadata: { liquidated_user: userAddress },
          tx_hash: receipt.hash,
          timestamp: new Date().toISOString(),
        });
      }

      setTimeout(() => setStatus(''), 5000);
    } catch (error: any) {
      console.error('Error liquidating:', error);
      setStatus(`Error: ${error.message || 'Transaction failed'}`);
      setTimeout(() => setStatus(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return null;
  }

  return (
    <div className="action-card liquidation-card">
      <h3>Liquidate Position</h3>
      <p className="card-description">
        Liquidate undercollateralized positions and earn a 10% bonus.
      </p>

      <div className="form-group">
        <label>User Address to Liquidate</label>
        <input
          type="text"
          value={userAddress}
          onChange={(e) => setUserAddress(e.target.value)}
          placeholder="0x..."
          disabled={loading || checking}
        />
      </div>

      <button
        onClick={checkHealthFactor}
        disabled={checking || !userAddress}
        className="btn btn-secondary"
      >
        {checking ? 'Checking...' : 'Check Health Factor'}
      </button>

      {healthFactor && (
        <div className={`health-display ${parseFloat(healthFactor) < 1 ? 'danger' : 'safe'}`}>
          Health Factor: {parseFloat(healthFactor).toFixed(4)}
        </div>
      )}

      {healthFactor && parseFloat(healthFactor) < 1 && (
        <>
          <div className="form-group">
            <label>Collateral Token</label>
            <select
              value={selectedToken}
              onChange={(e) => setSelectedToken(e.target.value)}
              disabled={loading}
            >
              {COLLATERAL_TOKENS.map((token) => (
                <option key={token.symbol} value={token.symbol}>
                  {token.name} ({token.symbol})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Debt to Cover (DSC)</label>
            <input
              type="number"
              value={debtAmount}
              onChange={(e) => setDebtAmount(e.target.value)}
              placeholder="0.0"
              disabled={loading}
              step="0.01"
              min="0"
            />
          </div>

          <button
            onClick={handleLiquidate}
            disabled={loading || !debtAmount}
            className="btn btn-danger"
          >
            {loading ? 'Processing...' : 'Liquidate'}
          </button>
        </>
      )}

      {status && <div className={`status-message ${status.includes('Error') || status.includes('Cannot') ? 'error' : 'success'}`}>{status}</div>}
    </div>
  );
};
