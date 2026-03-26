import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  connectWallet,
  switchNetwork,
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
});
