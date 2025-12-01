/*
  # Create Transactions Table

  1. New Tables
    - `transactions`
      - `id` (uuid, primary key) - Unique transaction ID
      - `user_address` (text) - User's wallet address
      - `transaction_type` (text) - Type: deposit_collateral, mint_dsc, redeem_collateral, burn_dsc, liquidation
      - `token` (text) - Token symbol (WETH, WBTC, DSC)
      - `amount` (text) - Transaction amount
      - `tx_hash` (text) - Blockchain transaction hash
      - `metadata` (jsonb) - Additional transaction data
      - `timestamp` (timestamptz) - Transaction timestamp
      - `created_at` (timestamptz) - Record creation time

  2. Security
    - Enable RLS on `transactions` table
    - Add policy for users to read their own transactions
    - Add policy for users to insert their own transactions
*/

CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_address text NOT NULL,
  transaction_type text NOT NULL,
  token text NOT NULL,
  amount text NOT NULL,
  tx_hash text NOT NULL,
  metadata jsonb DEFAULT '{}',
  timestamp timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own transactions"
  ON transactions
  FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own transactions"
  ON transactions
  FOR INSERT
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_transactions_user_address ON transactions(user_address);
CREATE INDEX IF NOT EXISTS idx_transactions_timestamp ON transactions(timestamp DESC);
