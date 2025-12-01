import { useState } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { parseUnits } from 'ethers';
import { COLLATERAL_TOKENS, CONTRACTS } from '../config';
import { supabase } from '../lib/supabase';

export const DepositCollateral = () => {
  const { account, dscEngineContract, wethContract, wbtcContract, isConnected } = useWeb3();
  const [selectedToken, setSelectedToken] = useState(COLLATERAL_TOKENS[0].symbol);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  const getTokenContract = (symbol: string) => {
    return symbol === 'WETH' ? wethContract : wbtcContract;
  };

  const handleDeposit = async () => {
    if (!account || !dscEngineContract || !amount) {
      setStatus('Please enter an amount');
      return;
    }

    setLoading(true);
    setStatus('Processing...');

    try {
      const tokenContract = getTokenContract(selectedToken);
      if (!tokenContract) {
        throw new Error('Token contract not found');
      }

      const tokenAddress = selectedToken === 'WETH' ? CONTRACTS.WETH : CONTRACTS.WBTC;
      const amountWei = parseUnits(amount, 18);

      setStatus('Approving tokens...');
      const approveTx = await tokenContract.approve(CONTRACTS.DSC_ENGINE, amountWei);
      await approveTx.wait();

      setStatus('Depositing collateral...');
      const depositTx = await dscEngineContract.deposit_collateral(tokenAddress, amountWei);
      const receipt = await depositTx.wait();

      setStatus('Success! Collateral deposited.');
      setAmount('');

      if (supabase) {
        await supabase.from('transactions').insert({
          user_address: account,
          transaction_type: 'deposit_collateral',
          token: selectedToken,
          amount: amount,
          tx_hash: receipt.hash,
          timestamp: new Date().toISOString(),
        });
      }

      setTimeout(() => setStatus(''), 3000);
    } catch (error: any) {
      console.error('Error depositing collateral:', error);
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
      <h3>Deposit Collateral</h3>

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
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.0"
          disabled={loading}
          step="0.001"
          min="0"
        />
      </div>

      <button
        onClick={handleDeposit}
        disabled={loading || !amount}
        className="btn btn-primary"
      >
        {loading ? 'Processing...' : 'Deposit'}
      </button>

      {status && <div className={`status-message ${status.includes('Error') ? 'error' : 'success'}`}>{status}</div>}
    </div>
  );
};
