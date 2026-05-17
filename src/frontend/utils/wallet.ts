import { BrowserProvider, Contract, formatEther, formatUnits, parseUnits, type ContractRunner } from "ethers";
import type { Signer } from "ethers";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "./contractInfo";

export interface WalletState {
  isConnected: boolean;
  address: string | null;
  chainId: number | null;
  balance: string | null;
  tokenBalance: string | null;
  tokenSymbol: string | null;
  tokenName: string | null;
}

export const connectWallet = async (requestPermission: boolean = true): Promise<{
  provider: BrowserProvider | null;
  signer: Signer | null;
  address: string | null;
  chainId: number | null;
  error?: string;
}> => {
  if (typeof window.ethereum === "undefined") {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    if (isMobile) {
      const currentUrl = window.location.href.replace(/^https?:\/\//, '');
      window.location.href = `https://metamask.app.link/dapp/${currentUrl}`;
      return { provider: null, signer: null, address: null, chainId: null, error: "Redirecting to MetaMask App..." };
    }

    return { provider: null, signer: null, address: null, chainId: null, error: "MetaMask not installed" };
  }

  try {
    const provider = new BrowserProvider(window.ethereum);

    if (requestPermission) {
      await provider.send("wallet_requestPermissions", [{ eth_accounts: {} }]);
    }

    const accounts = await provider.send("eth_requestAccounts", []);
    const signer = await provider.getSigner();
    const network = await provider.getNetwork();
    const chainId = Number(network.chainId);

    return {
      provider,
      signer,
      address: accounts[0],
      chainId,
    };
  } catch (error: unknown) {
    const err = error as { code?: string | number; message?: string; info?: { error?: { code?: number; message?: string } } };
    let errorMessage = "Failed to connect wallet";

    if (err.code === "ACTION_REJECTED" || err.code === 4001 || (err.info && err.info.error && err.info.error.code === 4001)) {
      errorMessage = "Connection request rejected. Please approve the connection in your wallet.";
    } else if (err.message) {
      errorMessage = err.message;
    }

    return {
      provider: null,
      signer: null,
      address: null,
      chainId: null,
      error: errorMessage,
    };
  }
};

export const getTokenBalance = async (
  provider: BrowserProvider,
  address: string
): Promise<string> => {
  try {
    if (!CONTRACT_ADDRESS) {
      throw new Error("Contract address not configured");
    }
    const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
    const balance = await contract.balanceOf(address);
    const decimals = await contract.decimals();
    return formatUnits(balance, decimals);
  } catch (error) {
    console.error("Error getting token balance:", error);
    return "0";
  }
};

export const getETHBalance = async (
  provider: BrowserProvider,
  address: string
): Promise<string> => {
  try {
    const balance = await provider.getBalance(address);
    return formatEther(balance);
  } catch (error) {
    console.error("Error getting ETH balance:", error);
    return "0";
  }
};

export const getTokenInfo = async (
  provider: BrowserProvider
): Promise<{ symbol: string; name: string; decimals: number }> => {
  try {
    if (!CONTRACT_ADDRESS) {
      throw new Error("Contract address not configured");
    }
    const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
    const symbol = await contract.symbol();
    const name = await contract.name();
    return { symbol, name, decimals: 18 };
  } catch (error) {
    console.error("Error getting token info:", error);
    return { symbol: "MTK", name: "MyToken", decimals: 18 };
  }
};

export const transferTokens = async (
  signer: Signer,
  toAddress: string,
  amount: string
): Promise<{ success: boolean; hash?: string; error?: string }> => {
  try {
    if (!CONTRACT_ADDRESS) {
      throw new Error("Contract address not configured");
    }
    const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
    const decimals = await contract.decimals();
    const amountInWei = parseUnits(amount, decimals);

    const tx = await contract.transfer(toAddress, amountInWei);
    await tx.wait();

    return { success: true, hash: tx.hash };
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("Error transferring tokens:", error);
    return { success: false, error: err.message || "Transfer failed" };
  }
};

export const switchNetwork = async (chainId: number): Promise<{ success: boolean; error?: string }> => {
  if (typeof window.ethereum === "undefined") {
    return { success: false, error: "MetaMask not installed" };
  }

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: `0x${chainId.toString(16)}` }],
    });
    return { success: true };
  } catch (error: unknown) {
    const err = error as { code?: number; message?: string };
    if (err.code === 4902) {
      return { success: false, error: "Network not added to MetaMask" };
    }
    return { success: false, error: err.message || "Failed to switch network" };
  }
};

export const watchTokenTransfers = async (
  runner: ContractRunner,
  address: string,
  onTransferReceived: (from: string, to: string, amount: bigint) => void
): Promise<() => void> => {
  if (!CONTRACT_ADDRESS) {
    throw new Error("Contract address not configured");
  }

  const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, runner);
  
  const filterTo = contract.filters.Transfer(null, address);
  const filterFrom = contract.filters.Transfer(address, null);

  const handleTo = (from: string, to: string, amount: bigint) => {
    onTransferReceived(from, to, amount);
  };

  const handleFrom = (from: string, to: string, amount: bigint) => {
    onTransferReceived(from, to, amount);
  };

  contract.on(filterTo, handleTo);
  contract.on(filterFrom, handleFrom);

  return () => {
    contract.off(filterTo, handleTo);
    contract.off(filterFrom, handleFrom);
  };
};
