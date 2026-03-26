import { useState, useEffect, useCallback } from "react";
import { ConnectWallet, BalanceDisplay, TransferForm, NetworkDetector } from "./frontend/components";
import { connectWallet, getTokenBalance, getETHBalance, getTokenInfo, transferTokens, switchNetwork } from "./frontend/utils/wallet";
import type { WalletState } from "./frontend/utils/wallet";

function App() {
  const [walletState, setWalletState] = useState<WalletState>({
    isConnected: false,
    address: null,
    chainId: null,
    balance: null,
    tokenBalance: null,
    tokenSymbol: null,
    tokenName: null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateWalletInfo = useCallback(async (provider: any, address: string, chainId: number) => {
    setIsLoading(true);
    try {
      const [ethBalance, tokenBalance, tokenInfo] = await Promise.all([
        getETHBalance(provider, address),
        getTokenBalance(provider, address),
        getTokenInfo(provider),
      ]);

      setWalletState((prev) => ({
        ...prev,
        balance: ethBalance,
        tokenBalance: tokenBalance,
        tokenSymbol: tokenInfo.symbol,
        tokenName: tokenInfo.name,
        chainId,
      }));
    } catch (err) {
      console.error("Error updating wallet info:", err);
      setError("Failed to fetch wallet information");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleConnect = async () => {
    setError(null);
    const result = await connectWallet();

    if (result.error) {
      setError(result.error);
      return;
    }

    if (result.provider && result.signer && result.address && result.chainId) {
      setWalletState({
        isConnected: true,
        address: result.address,
        chainId: result.chainId,
        balance: null,
        tokenBalance: null,
        tokenSymbol: null,
        tokenName: null,
      });

      await updateWalletInfo(result.provider, result.address, result.chainId);
    }
  };

  const handleDisconnect = () => {
    setWalletState({
      isConnected: false,
      address: null,
      chainId: null,
      balance: null,
      tokenBalance: null,
      tokenSymbol: null,
      tokenName: null,
    });
    setError(null);
  };

  const handleTransfer = async (toAddress: string, amount: string) => {
    if (!walletState.isConnected) {
      return { success: false, error: "Wallet not connected" };
    }

    const result = await connectWallet();
    if (result.error || !result.signer) {
      return { success: false, error: result.error || "Failed to connect wallet" };
    }

    const transferResult = await transferTokens(result.signer, toAddress, amount);

    if (transferResult.success) {
      // Refresh balances after successful transfer
      if (result.provider) {
        await updateWalletInfo(result.provider, walletState.address!, walletState.chainId!);
      }
    }

    return transferResult;
  };

  const handleSwitchNetwork = async (chainId: number) => {
    const result = await switchNetwork(chainId);
    if (!result.success) {
      setError(result.error || "Failed to switch network");
    }
  };

  // Listen for account/chain changes
  useEffect(() => {
    if (typeof window.ethereum !== "undefined") {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          handleDisconnect();
        } else if (walletState.isConnected && accounts[0] !== walletState.address) {
          setWalletState((prev) => ({ ...prev, address: accounts[0] }));
        }
      };

      const handleChainChanged = (newChainId: string) => {
        const chainIdNum = parseInt(newChainId, 16);
        setWalletState((prev) => ({ ...prev, chainId: chainIdNum }));
      };

      window.ethereum.on("accountsChanged", handleAccountsChanged);
      window.ethereum.on("chainChanged", handleChainChanged);

      return () => {
        if (window.ethereum) {
          window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
          window.ethereum.removeListener("chainChanged", handleChainChanged);
        }
      };
    }
  }, [walletState.isConnected, walletState.address]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.31-8.86c-1.77-.45-2.34-.94-2.34-1.67 0-.84.79-1.43 2.1-1.43 1.38 0 1.9.66 1.94 1.64h1.71c-.05-1.34-.87-2.57-2.49-2.97V5H10.9v1.69c-1.51.32-2.72 1.3-2.72 3.01 0 1.79 1.49 2.69 3.66 3.21 1.95.46 2.34 1.15 2.34 1.87 0 .53-.39 1.39-2.1 1.39-1.6 0-2.29-.72-2.38-1.64H8.04c.1 1.7 1.36 2.66 2.86 2.97V19h2.34v-1.67c1.52-.29 2.72-1.16 2.73-3.01 0-1.96-1.61-2.67-3.66-3.18z"/>
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">ERC20 Dashboard</h1>
                <p className="text-xs text-gray-500">MyToken (MTK)</p>
              </div>
            </div>
            <ConnectWallet
              address={walletState.address}
              isConnected={walletState.isConnected}
              onConnect={handleConnect}
              onDisconnect={handleDisconnect}
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-300 text-red-800 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-red-600 hover:text-red-800" aria-label="Dismiss error">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        )}

        {!walletState.isConnected ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mb-6">
              <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Connect Your Wallet</h2>
            <p className="text-gray-600 mb-6 text-center max-w-md">
              Connect your MetaMask wallet to view your token balance and make transfers
            </p>
            <button
              onClick={handleConnect}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              Connect Wallet
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Network Status */}
            <NetworkDetector
              chainId={walletState.chainId}
              onSwitchNetwork={handleSwitchNetwork}
            />

            {/* Balance Display */}
            <BalanceDisplay
              ethBalance={walletState.balance}
              tokenBalance={walletState.tokenBalance}
              tokenSymbol={walletState.tokenSymbol}
              tokenName={walletState.tokenName}
              isLoading={isLoading}
            />

            {/* Transfer Form */}
            <TransferForm
              onTransfer={handleTransfer}
              tokenSymbol={walletState.tokenSymbol}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto py-6 border-t border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-gray-500">
          <p>ERC20 Token Dashboard • Built with React, Ethers.js & Tailwind CSS</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
