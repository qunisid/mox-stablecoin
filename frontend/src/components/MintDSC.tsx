import { useState } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { parseUnits } from 'ethers';
import { supabase } from '../lib/supabase';

export const MintDSC = () => {
  const { account, dscEngineContract, isConnected } = useWeb3();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  const handleMint = async () => {
    if (!account || !dscEngineContract || !amount) {
      setStatus('Please enter an amount');
      return;
    }

    setLoading(true);
    setStatus('Minting DSC...');

    try {
      const amountWei = parseUnits(amount, 18);
      const tx = await dscEngineContract.mint_dsc(amountWei);
      const receipt = await tx.wait();

      setStatus('Success! DSC minted.');
      setAmount('');

      if (supabase) {
        await supabase.from('transactions').insert({
          user_address: account,
          transaction_type: 'mint_dsc',
          token: 'DSC',
          amount: amount,
          tx_hash: receipt.hash,
          timestamp: new Date().toISOString(),
        });
      }

      setTimeout(() => setStatus(''), 3000);
    } catch (error: any) {
      console.error('Error minting DSC:', error);
      const errorMsg = error.message || 'Transaction failed';
      if (errorMsg.includes('BreaksHealthFactor')) {
        setStatus('Error: Insufficient collateral. Your health factor would drop below 1.');
      } else {
        setStatus(`Error: ${errorMsg}`);
      }
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
      <h3>Mint DSC</h3>
      <p className="card-description">
        Mint DSC stablecoins against your deposited collateral. Keep your health factor above 1.
      </p>

      <div className="form-group">
        <label>Amount (DSC)</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.0"
          disabled={loading}
          step="0.01"
          min="0"
        />
      </div>

      <button
        onClick={handleMint}
        disabled={loading || !amount}
        className="btn btn-primary"
      >
        {loading ? 'Processing...' : 'Mint DSC'}
      </button>

      {status && <div className={`status-message ${status.includes('Error') ? 'error' : 'success'}`}>{status}</div>}
    </div>
  );
};
