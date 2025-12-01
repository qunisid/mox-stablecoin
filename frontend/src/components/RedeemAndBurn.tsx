import { useState } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { parseUnits } from 'ethers';
import { COLLATERAL_TOKENS, CONTRACTS } from '../config';
import { supabase } from '../lib/supabase';

export const RedeemAndBurn = () => {
  const { account, dscEngineContract, isConnected } = useWeb3();
  const [selectedToken, setSelectedToken] = useState(COLLATERAL_TOKENS[0].symbol);
  const [collateralAmount, setCollateralAmount] = useState('');
  const [dscAmount, setDscAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [activeTab, setActiveTab] = useState<'redeem' | 'burn'>('redeem');

  const handleRedeem = async () => {
    if (!account || !dscEngineContract || !collateralAmount) {
      setStatus('Please enter an amount');
      return;
    }

    setLoading(true);
    setStatus('Redeeming collateral...');

    try {
      const tokenAddress = selectedToken === 'WETH' ? CONTRACTS.WETH : CONTRACTS.WBTC;
      const amountWei = parseUnits(collateralAmount, 18);

      const tx = await dscEngineContract.redeem_collateral(tokenAddress, amountWei);
      const receipt = await tx.wait();

      setStatus('Success! Collateral redeemed.');
      setCollateralAmount('');

      if (supabase) {
        await supabase.from('transactions').insert({
          user_address: account,
          transaction_type: 'redeem_collateral',
          token: selectedToken,
          amount: collateralAmount,
          tx_hash: receipt.hash,
          timestamp: new Date().toISOString(),
        });
      }

      setTimeout(() => setStatus(''), 3000);
    } catch (error: any) {
      console.error('Error redeeming collateral:', error);
      const errorMsg = error.message || 'Transaction failed';
      if (errorMsg.includes('BreaksHealthFactor')) {
        setStatus('Error: This would break your health factor. Burn some DSC first.');
      } else {
        setStatus(`Error: ${errorMsg}`);
      }
      setTimeout(() => setStatus(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleBurn = async () => {
    if (!account || !dscEngineContract || !dscAmount) {
      setStatus('Please enter an amount');
      return;
    }

    setLoading(true);
    setStatus('Burning DSC...');

    try {
      const amountWei = parseUnits(dscAmount, 18);
      const tx = await dscEngineContract.burn_dsc(amountWei);
      const receipt = await tx.wait();

      setStatus('Success! DSC burned.');
      setDscAmount('');

      if (supabase) {
        await supabase.from('transactions').insert({
          user_address: account,
          transaction_type: 'burn_dsc',
          token: 'DSC',
          amount: dscAmount,
          tx_hash: receipt.hash,
          timestamp: new Date().toISOString(),
        });
      }

      setTimeout(() => setStatus(''), 3000);
    } catch (error: any) {
      console.error('Error burning DSC:', error);
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
    <div className="action-card">
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'redeem' ? 'active' : ''}`}
          onClick={() => setActiveTab('redeem')}
        >
          Redeem Collateral
        </button>
        <button
          className={`tab ${activeTab === 'burn' ? 'active' : ''}`}
          onClick={() => setActiveTab('burn')}
        >
          Burn DSC
        </button>
      </div>

      {activeTab === 'redeem' ? (
        <>
          <h3>Redeem Collateral</h3>
          <p className="card-description">
            Withdraw your collateral. Ensure your health factor stays above 1.
          </p>

          <div className="form-group">
            <label>Select Token</label>
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
            <label>Amount</label>
            <input
              type="number"
              value={collateralAmount}
              onChange={(e) => setCollateralAmount(e.target.value)}
              placeholder="0.0"
              disabled={loading}
              step="0.001"
              min="0"
            />
          </div>

          <button
            onClick={handleRedeem}
            disabled={loading || !collateralAmount}
            className="btn btn-primary"
          >
            {loading ? 'Processing...' : 'Redeem'}
          </button>
        </>
      ) : (
        <>
          <h3>Burn DSC</h3>
          <p className="card-description">
            Burn DSC tokens to reduce your debt and improve your health factor.
          </p>

          <div className="form-group">
            <label>Amount (DSC)</label>
            <input
              type="number"
              value={dscAmount}
              onChange={(e) => setDscAmount(e.target.value)}
              placeholder="0.0"
              disabled={loading}
              step="0.01"
              min="0"
            />
          </div>

          <button
            onClick={handleBurn}
            disabled={loading || !dscAmount}
            className="btn btn-primary"
          >
            {loading ? 'Processing...' : 'Burn DSC'}
          </button>
        </>
      )}

      {status && <div className={`status-message ${status.includes('Error') ? 'error' : 'success'}`}>{status}</div>}
    </div>
  );
};
