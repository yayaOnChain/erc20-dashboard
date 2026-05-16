import { useState, useEffect, useCallback, useRef } from "react";
import { ConnectWallet, BalanceDisplay, TransferForm, NetworkDetector } from "./frontend/components";
import { connectWallet, getTokenBalance, getETHBalance, getTokenInfo, transferTokens, switchNetwork, watchTokenTransfers } from "./frontend/utils/wallet";
import type { WalletState } from "./frontend/utils/wallet";
import { ethers, type BrowserProvider } from "ethers";

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

  const updateWalletInfoRef = useRef<(provider: BrowserProvider, address: string, chainId: number) => Promise<void>>(null!);
  const handleDisconnectRef = useRef<() => void>(null!);
  const STORAGE_KEY = "erc20wallet_address";
  const DISCONNECT_FLAG_KEY = "erc20wallet_disconnected";

  const setStoredAddress = (address: string | null) => {
    try {
      if (address) {
        localStorage.setItem(STORAGE_KEY, address);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // localStorage unavailable
    }
  };

  const getStoredAddress = (): string | null => {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      // localStorage unavailable
      return null;
    }
  };

  const setDisconnectedFlag = (value: boolean) => {
    try {
      if (value) {
        localStorage.setItem(DISCONNECT_FLAG_KEY, "1");
      } else {
        localStorage.removeItem(DISCONNECT_FLAG_KEY);
      }
    } catch {
      // localStorage unavailable
    }
  };

  const wasExplicitlyDisconnected = (): boolean => {
    try {
      return localStorage.getItem(DISCONNECT_FLAG_KEY) === "1";
    } catch {
      return false;
    }
  };

  const updateWalletInfo = useCallback(async (provider: BrowserProvider, address: string, chainId: number) => {
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

  updateWalletInfoRef.current = updateWalletInfo;

  const handleConnect = useCallback(async () => {
    setError(null);
    setDisconnectedFlag(false);
    
    if (typeof window.ethereum !== "undefined") {
      try {
        const accounts: string[] = await window.ethereum.request({ method: "eth_accounts" });
        if (accounts.length > 0) {
          const result = await connectWallet();
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
            setStoredAddress(result.address);
            await updateWalletInfo(result.provider, result.address, result.chainId);
          }
          return;
        }
      } catch {
        // Ignore errors, will fallback to full connectWallet flow
      }
    }
    
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
      setStoredAddress(result.address);
      await updateWalletInfo(result.provider, result.address, result.chainId);
    }
  }, [updateWalletInfo]);

  const handleDisconnect = useCallback(() => {
    setWalletState({
      isConnected: false,
      address: null,
      chainId: null,
      balance: null,
      tokenBalance: null,
      tokenSymbol: null,
      tokenName: null,
    });
    setStoredAddress(null);
    setDisconnectedFlag(true);
    setError(null);
  }, []);

  handleDisconnectRef.current = handleDisconnect;

  const handleTransfer = useCallback(async (toAddress: string, amount: string) => {
    if (!walletState.isConnected) {
      return { success: false, error: "Wallet not connected" };
    }

    const result = await connectWallet();
    if (result.error || !result.signer) {
      return { success: false, error: result.error || "Failed to connect wallet" };
    }

    const transferResult = await transferTokens(result.signer, toAddress, amount);

    if (transferResult.success) {
      if (result.provider && walletState.address && walletState.chainId) {
        await updateWalletInfo(result.provider, walletState.address, walletState.chainId);
      }
    }

    return transferResult;
  }, [walletState.isConnected, walletState.address, walletState.chainId, updateWalletInfo]);

  const handleSwitchNetwork = useCallback(async (chainId: number) => {
    const result = await switchNetwork(chainId);
    if (!result.success) {
      setError(result.error || "Failed to switch network");
    }
  }, []);

  useEffect(() => {
    const tryAutoConnect = async () => {
      if (typeof window.ethereum === "undefined") return;
      if (wasExplicitlyDisconnected()) return;
      
      try {
        let accounts: string[] = await window.ethereum.request({ method: "eth_accounts" });
        
        if (accounts.length === 0) {
          const storedAddr = getStoredAddress();
          if (storedAddr) {
            accounts = [storedAddr];
          } else {
            return;
          }
        }

        const result = await connectWallet();
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
          setStoredAddress(result.address);
          const updateFn = updateWalletInfoRef.current;
          if (updateFn) {
            await updateFn(result.provider, result.address, result.chainId);
          }
        }
      } catch {
        // Ignore auto-connect errors
      }
    };

    tryAutoConnect();
  }, []);

  useEffect(() => {
    if (typeof window.ethereum === "undefined") {
      return;
    }

    const handleAccountsChanged = async (accounts: string[]) => {
      const disconnectFn = handleDisconnectRef.current;
      if (accounts.length === 0) {
        if (disconnectFn) disconnectFn();
      } else if (accounts[0] !== walletState.address) {
        setWalletState((prev) => ({ ...prev, address: accounts[0] }));
        if (walletState.isConnected && walletState.address) {
          const updateFn = updateWalletInfoRef.current;
          if (updateFn && window.ethereum) {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const chainId = await provider.getNetwork().then(n => n.chainId).catch(() => 0n);
            await updateFn(provider, accounts[0], Number(chainId));
          }
        }
      }
    };

    const handleChainChanged = async (newChainId: string) => {
      const chainIdNum = parseInt(newChainId, 16);
      setWalletState((prev) => ({ ...prev, chainId: chainIdNum }));
      if (walletState.isConnected && walletState.address) {
        const updateFn = updateWalletInfoRef.current;
        if (updateFn && window.ethereum) {
          const provider = new ethers.BrowserProvider(window.ethereum);
          await updateFn(provider, walletState.address, chainIdNum);
        }
      }
    };

    const handleMessage = async () => {
      if (walletState.isConnected && walletState.address && window.ethereum) {
        const updateFn = updateWalletInfoRef.current;
        if (updateFn) {
          const provider = new ethers.BrowserProvider(window.ethereum);
          await updateFn(provider, walletState.address, walletState.chainId || 0);
        }
      }
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged as (...args: unknown[]) => void);
    window.ethereum.on("chainChanged", handleChainChanged as (...args: unknown[]) => void);
    window.ethereum.on("message", handleMessage as (...args: unknown[]) => void);

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener("accountsChanged", handleAccountsChanged as (...args: unknown[]) => void);
        window.ethereum.removeListener("chainChanged", handleChainChanged as (...args: unknown[]) => void);
        window.ethereum.removeListener("message", handleMessage as (...args: unknown[]) => void);
      }
    };
  }, [walletState.isConnected, walletState.address, walletState.chainId]);

  useEffect(() => {
    if (!walletState.isConnected || !walletState.address || typeof window.ethereum === "undefined") {
      return;
    }

    const address = walletState.address;
    const ethereum = window.ethereum;

    let isMounted = true;

    const setupWatcher = async () => {
      const provider = new ethers.BrowserProvider(ethereum);
      const unwatch = await watchTokenTransfers(
        provider,
        address,
        async () => {
          if (isMounted && walletState.address) {
            const updateFn = updateWalletInfoRef.current;
            if (updateFn) {
              const chainId = await provider.getNetwork().then(n => n.chainId).catch(() => 0n);
              await updateFn(provider, address, Number(chainId));
            }
          }
        }
      );
      return unwatch;
    };

    let unwatch: (() => void) | undefined;
    setupWatcher().then(fn => {
      unwatch = fn;
    });

    return () => {
      isMounted = false;
      if (unwatch) unwatch();
    };
  }, [walletState.isConnected, walletState.address, walletState.chainId]);

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100">
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-center sm:justify-between gap-4 sm:gap-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-linear-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
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
            <div className="w-24 h-24 bg-linear-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mb-6">
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
            <NetworkDetector
              chainId={walletState.chainId}
              onSwitchNetwork={handleSwitchNetwork}
            />
            <BalanceDisplay
              ethBalance={walletState.balance}
              tokenBalance={walletState.tokenBalance}
              tokenSymbol={walletState.tokenSymbol}
              tokenName={walletState.tokenName}
              isLoading={isLoading}
            />
            <TransferForm
              onTransfer={handleTransfer}
              tokenSymbol={walletState.tokenSymbol}
            />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;