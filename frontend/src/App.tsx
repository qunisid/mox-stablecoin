import { Web3Provider } from './context/Web3Context';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { DepositCollateral } from './components/DepositCollateral';
import { MintDSC } from './components/MintDSC';
import { RedeemAndBurn } from './components/RedeemAndBurn';
import { Liquidation } from './components/Liquidation';
import './App.css';

function App() {
  return (
    <Web3Provider>
      <div className="app">
        <Header />

        <main className="main-content">
          <Dashboard />

          <div className="actions-grid">
            <DepositCollateral />
            <MintDSC />
            <RedeemAndBurn />
            <Liquidation />
          </div>
        </main>

        <footer className="footer">
          <p>Decentralized Stablecoin DApp - Powered by Vyper Smart Contracts</p>
        </footer>
      </div>
    </Web3Provider>
  );
}

export default App;
