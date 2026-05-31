import { describe, it, expect } from 'vitest';
import { ConnectWallet, BalanceDisplay, TransferForm, NetworkDetector } from '@/frontend/components';

describe('components barrel exports', () => {
  it('should export ConnectWallet', () => {
    expect(ConnectWallet).toBeDefined();
  });

  it('should export BalanceDisplay', () => {
    expect(BalanceDisplay).toBeDefined();
  });

  it('should export TransferForm', () => {
    expect(TransferForm).toBeDefined();
  });

  it('should export NetworkDetector', () => {
    expect(NetworkDetector).toBeDefined();
  });
});
