import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/frontend/utils/contractInfo', () => ({
  CONTRACT_ADDRESS: '',
  CONTRACT_ABI: [],
  CONTRACT_CHAIN_ID: '',
  SUPPORTED_CHAINS: {},
}));

import {
  connectWallet,
  switchNetwork,
  getTokenBalance,
  getTokenInfo,
  transferTokens,
  watchTokenTransfers,
  type WalletState,
} from '@/frontend/utils/wallet';

describe('wallet utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete (window as unknown as Record<string, unknown>).ethereum;
  });

  describe('connectWallet', () => {
    it('should return error if MetaMask is not installed', async () => {
      delete (window as unknown as Record<string, unknown>).ethereum;

      const result = await connectWallet();

      expect(result.error).toBe('MetaMask not installed');
      expect(result.provider).toBeNull();
      expect(result.signer).toBeNull();
      expect(result.address).toBeNull();
      expect(result.chainId).toBeNull();
    });

    it('should redirect to MetaMask app deep link on mobile if not installed', async () => {
      delete (window as unknown as Record<string, unknown>).ethereum;
      
      const originalUserAgent = navigator.userAgent;
      const originalLocation = window.location;

      // Mock userAgent to simulate mobile
      Object.defineProperty(navigator, 'userAgent', {
        value: 'iPhone',
        configurable: true,
      });

      // Mock window.location
      Object.defineProperty(window, 'location', {
        value: { href: 'http://localhost:5173/' },
        writable: true,
        configurable: true,
      });

      const result = await connectWallet();

      expect(result.error).toBe('Redirecting to MetaMask App...');
      expect(window.location.href).toBe('https://metamask.app.link/dapp/localhost:5173/');

      // Restore
      Object.defineProperty(navigator, 'userAgent', {
        value: originalUserAgent,
        configurable: true,
      });
      Object.defineProperty(window, 'location', {
        value: originalLocation,
        writable: true,
        configurable: true,
      });
    });

    it('should handle user rejection error properly', async () => {
      // Mock window.ethereum to reject the request
      (window as unknown as Record<string, unknown>).ethereum = {
        request: vi.fn().mockRejectedValue({ code: 4001 }),
      };

      const result = await connectWallet();

      expect(result.error).toBe('Connection request rejected. Please approve the connection in your wallet.');
      expect(result.provider).toBeNull();
    });

    it('should handle error with custom message', async () => {
      (window as unknown as Record<string, unknown>).ethereum = {
        request: vi.fn().mockRejectedValue(new Error('Custom error')),
      };

      const result = await connectWallet();

      expect(result.error).toBeTruthy();
      expect(result.error).not.toBe('Failed to connect wallet');
    });
  });

  describe('switchNetwork', () => {
    it('should return error if MetaMask is not installed', async () => {
      delete (window as unknown as Record<string, unknown>).ethereum;

      const result = await switchNetwork(11155111);

      expect(result.success).toBe(false);
      expect(result.error).toBe('MetaMask not installed');
    });

    it('should switch network successfully', async () => {
      (window as unknown as Record<string, unknown>).ethereum = {
        request: vi.fn().mockResolvedValue(undefined),
      };

      const result = await switchNetwork(11155111);

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should handle network not added error', async () => {
      (window as unknown as Record<string, unknown>).ethereum = {
        request: vi.fn().mockRejectedValue({ code: 4902, message: 'Unrecognized chain ID' }),
      };

      const result = await switchNetwork(11155111);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network not added to MetaMask');
    });

    it('should handle other switch errors', async () => {
      (window as unknown as Record<string, unknown>).ethereum = {
        request: vi.fn().mockRejectedValue(new Error('User rejected')),
      };

      const result = await switchNetwork(11155111);

      expect(result.success).toBe(false);
      expect(result.error).toBe('User rejected');
    });

    it('should return default error when error has no message', async () => {
      (window as unknown as Record<string, unknown>).ethereum = {
        request: vi.fn().mockRejectedValue({ code: 1234 }),
      };

      const result = await switchNetwork(11155111);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to switch network');
    });
  });

  describe('WalletState type', () => {
    it('should have correct WalletState structure', () => {
      const walletState: WalletState = {
        isConnected: false,
        address: null,
        chainId: null,
        balance: null,
        tokenBalance: null,
        tokenSymbol: null,
        tokenName: null,
      };

      expect(walletState.isConnected).toBe(false);
      expect(walletState.address).toBeNull();
      expect(walletState.chainId).toBeNull();
    });
  });

  describe('contract functions with empty address', () => {
    it('getTokenBalance should return 0 when CONTRACT_ADDRESS is empty', async () => {
      const result = await getTokenBalance({} as never, '0x1234');
      expect(result).toBe('0');
    });

    it('getTokenInfo should return defaults when CONTRACT_ADDRESS is empty', async () => {
      const result = await getTokenInfo({} as never);
      expect(result).toEqual({ symbol: 'MTK', name: 'MyToken', decimals: 18 });
    });

    it('transferTokens should return error when CONTRACT_ADDRESS is empty', async () => {
      const result = await transferTokens({} as never, '0x1234', '100');
      expect(result).toEqual({ success: false, error: 'Contract address not configured' });
    });

    it('watchTokenTransfers should throw when CONTRACT_ADDRESS is empty', async () => {
      await expect(watchTokenTransfers({} as never, '0x1234', vi.fn())).rejects.toThrow('Contract address not configured');
    });
  });
});
