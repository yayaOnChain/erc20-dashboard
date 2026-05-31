import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/frontend/utils/contractInfo', () => ({
  CONTRACT_ADDRESS: '0x1234567890abcdef1234567890abcdef12345678',
  CONTRACT_ABI: [],
  CONTRACT_CHAIN_ID: '11155111',
  SUPPORTED_CHAINS: {
    31337: { name: 'Hardhat Local', rpc: 'http://127.0.0.1:8545' },
    11155111: { name: 'Sepolia Testnet', rpc: 'https://rpc.sepolia.org' },
  },
}));

const mockProvider = {
  getBalance: vi.fn(),
  send: vi.fn(),
  getSigner: vi.fn(),
  getNetwork: vi.fn(),
};

const mockContract = {
  balanceOf: vi.fn(),
  decimals: vi.fn(),
  symbol: vi.fn(),
  name: vi.fn(),
  transfer: vi.fn(() => ({ wait: vi.fn() })),
  filters: { Transfer: vi.fn(() => ({})) },
  on: vi.fn(),
  off: vi.fn(),
};

vi.mock('ethers', async (importOriginal) => {
  const actual = await importOriginal<{
    formatEther: (v: bigint) => string;
    formatUnits: (v: bigint, d: number) => string;
    parseUnits: (v: string, d: number) => bigint;
  }>();
  return {
    formatEther: actual.formatEther,
    formatUnits: actual.formatUnits,
    parseUnits: actual.parseUnits,
    BrowserProvider: vi.fn().mockImplementation(function () { return mockProvider; }),
    Contract: vi.fn().mockImplementation(function () { return mockContract; }),
  };
});

import { connectWallet, getTokenBalance, getETHBalance, getTokenInfo, transferTokens, watchTokenTransfers } from '@/frontend/utils/wallet';

describe('wallet contract functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('connectWallet success', () => {
    beforeEach(() => {
      (window as unknown as Record<string, unknown>).ethereum = {};
    });

    afterEach(() => {
      delete (window as unknown as Record<string, unknown>).ethereum;
    });

    it('should connect and return provider, signer, address, chainId', async () => {
      mockProvider.send.mockImplementation(async (method: string) => {
        if (method === 'wallet_requestPermissions') return [];
        if (method === 'eth_requestAccounts') return ['0x1234567890abcdef1234567890abcdef12345678'];
        return undefined;
      });
      mockProvider.getSigner.mockResolvedValue({} as never);
      mockProvider.getNetwork.mockResolvedValue({ chainId: BigInt(31337) });

      const result = await connectWallet();

      expect(result.provider).toBe(mockProvider);
      expect(result.signer).toEqual({});
      expect(result.address).toBe('0x1234567890abcdef1234567890abcdef12345678');
      expect(result.chainId).toBe(31337);
      expect(result.error).toBeUndefined();
    });

    it('should skip requestPermissions when requestPermission is false', async () => {
      mockProvider.send.mockImplementation(async (method: string) => {
        if (method === 'eth_requestAccounts') return ['0x1234567890abcdef1234567890abcdef12345678'];
        return undefined;
      });
      mockProvider.getSigner.mockResolvedValue({} as never);
      mockProvider.getNetwork.mockResolvedValue({ chainId: BigInt(31337) });

      const result = await connectWallet(false);

      expect(result.provider).toBe(mockProvider);
      expect(result.address).toBe('0x1234567890abcdef1234567890abcdef12345678');
      expect(result.error).toBeUndefined();
      expect(mockProvider.send).not.toHaveBeenCalledWith('wallet_requestPermissions', expect.anything());
    });

    it('should handle rejection with code 4001', async () => {
      mockProvider.send.mockImplementation(async (method: string) => {
        if (method === 'wallet_requestPermissions') throw { code: 4001, message: 'User denied' };
        return undefined;
      });

      const result = await connectWallet();

      expect(result.error).toBe('Connection request rejected. Please approve the connection in your wallet.');
      expect(result.provider).toBeNull();
    });

    it('should handle rejection with code ACTION_REJECTED', async () => {
      mockProvider.send.mockImplementation(async (method: string) => {
        if (method === 'wallet_requestPermissions') throw { code: 'ACTION_REJECTED' };
        return undefined;
      });

      const result = await connectWallet();

      expect(result.error).toBe('Connection request rejected. Please approve the connection in your wallet.');
      expect(result.provider).toBeNull();
    });

    it('should handle rejection with info.error.code 4001', async () => {
      mockProvider.send.mockImplementation(async (method: string) => {
        if (method === 'wallet_requestPermissions') throw { info: { error: { code: 4001, message: 'User denied' } } };
        return undefined;
      });

      const result = await connectWallet();

      expect(result.error).toBe('Connection request rejected. Please approve the connection in your wallet.');
      expect(result.provider).toBeNull();
    });

    it('should return default error when error has no message', async () => {
      mockProvider.send.mockImplementation(async (method: string) => {
        if (method === 'wallet_requestPermissions') throw {};
        return undefined;
      });

      const result = await connectWallet();

      expect(result.error).toBe('Failed to connect wallet');
      expect(result.provider).toBeNull();
    });
  });

  describe('getTokenBalance', () => {
    const address = '0xabcdef1234567890abcdef1234567890abcdef12';

    it('should return formatted token balance', async () => {
      mockContract.balanceOf.mockResolvedValue(BigInt('1000000000000000000000'));
      mockContract.decimals.mockResolvedValue(18);

      const result = await getTokenBalance({} as never, address);

      expect(result).toBe('1000.0');
      expect(mockContract.balanceOf).toHaveBeenCalledWith(address);
      expect(mockContract.decimals).toHaveBeenCalled();
    });

    it('should return 0 on error', async () => {
      mockContract.balanceOf.mockRejectedValue(new Error('RPC error'));

      const result = await getTokenBalance({} as never, address);

      expect(result).toBe('0');
    });
  });

  describe('getETHBalance', () => {
    const address = '0xabcdef1234567890abcdef1234567890abcdef12';

    it('should return formatted ETH balance', async () => {
      mockProvider.getBalance.mockResolvedValue(BigInt('1500000000000000000'));

      const result = await getETHBalance(mockProvider as never, address);

      expect(result).toBe('1.5');
      expect(mockProvider.getBalance).toHaveBeenCalledWith(address);
    });

    it('should return 0 on error', async () => {
      mockProvider.getBalance.mockRejectedValue(new Error('RPC error'));

      const result = await getETHBalance(mockProvider as never, address);

      expect(result).toBe('0');
    });
  });

  describe('getTokenInfo', () => {
    it('should return token info', async () => {
      mockContract.symbol.mockResolvedValue('MTK');
      mockContract.name.mockResolvedValue('MyToken');

      const result = await getTokenInfo({} as never);

      expect(result).toEqual({ symbol: 'MTK', name: 'MyToken', decimals: 18 });
    });

    it('should return defaults on error', async () => {
      mockContract.symbol.mockRejectedValue(new Error('RPC error'));

      const result = await getTokenInfo({} as never);

      expect(result).toEqual({ symbol: 'MTK', name: 'MyToken', decimals: 18 });
    });
  });

  describe('transferTokens', () => {
    const toAddress = '0xabcdef1234567890abcdef1234567890abcdef12';
    const amount = '100';

    it('should transfer tokens successfully', async () => {
      mockContract.decimals.mockResolvedValue(18);
      const mockTx = { hash: '0xabc123', wait: vi.fn() };
      mockContract.transfer.mockResolvedValue(mockTx);

      const result = await transferTokens({} as never, toAddress, amount);

      expect(result).toEqual({ success: true, hash: '0xabc123' });
      expect(mockContract.transfer).toHaveBeenCalledWith(toAddress, BigInt('100000000000000000000'));
      expect(mockTx.wait).toHaveBeenCalled();
    });

    it('should return error on failure', async () => {
      mockContract.decimals.mockResolvedValue(18);
      mockContract.transfer.mockRejectedValue(new Error('Insufficient balance'));

      const result = await transferTokens({} as never, toAddress, amount);

      expect(result).toEqual({ success: false, error: 'Insufficient balance' });
    });

    it('should return generic error when message is missing', async () => {
      mockContract.decimals.mockResolvedValue(18);
      mockContract.transfer.mockRejectedValue({});

      const result = await transferTokens({} as never, toAddress, amount);

      expect(result).toEqual({ success: false, error: 'Transfer failed' });
    });
  });

  describe('watchTokenTransfers', () => {
    const address = '0xabcdef1234567890abcdef1234567890abcdef12';

    it('should set up event listeners and return cleanup function', async () => {
      const callback = vi.fn();
      const filterTo = {};
      const filterFrom = {};
      mockContract.filters.Transfer
        .mockReturnValueOnce(filterTo)
        .mockReturnValueOnce(filterFrom);

      const cleanup = await watchTokenTransfers({} as never, address, callback);

      expect(mockContract.filters.Transfer).toHaveBeenCalledWith(null, address);
      expect(mockContract.filters.Transfer).toHaveBeenCalledWith(address, null);
      expect(mockContract.on).toHaveBeenCalledTimes(2);
      expect(mockContract.on).toHaveBeenCalledWith(filterTo, expect.any(Function));
      expect(mockContract.on).toHaveBeenCalledWith(filterFrom, expect.any(Function));

      expect(typeof cleanup).toBe('function');

      cleanup();

      expect(mockContract.off).toHaveBeenCalledTimes(2);
    });

    it('should invoke callback on Transfer events from both handlers', async () => {
      mockContract.filters.Transfer.mockReturnValue({});

      const handlers: Array<(from: string, to: string, amount: bigint) => void> = [];
      mockContract.on.mockImplementation((_filter: unknown, handler: (from: string, to: string, amount: bigint) => void) => {
        handlers.push(handler);
      });

      const callback = vi.fn();
      await watchTokenTransfers({} as never, address, callback);

      handlers[0]('0xfrom1', '0xto1', BigInt(100));
      handlers[1]('0xfrom2', '0xto2', BigInt(200));

      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenCalledWith('0xfrom1', '0xto1', BigInt(100));
      expect(callback).toHaveBeenCalledWith('0xfrom2', '0xto2', BigInt(200));
    });
  });
});
