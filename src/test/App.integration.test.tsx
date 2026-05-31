import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '@/App';
import * as walletUtils from '@/frontend/utils/wallet';

vi.mock('@/frontend/utils/wallet', () => ({
  connectWallet: vi.fn(),
  getTokenBalance: vi.fn(),
  getETHBalance: vi.fn(),
  getTokenInfo: vi.fn(),
  transferTokens: vi.fn(),
  switchNetwork: vi.fn(),
  watchTokenTransfers: vi.fn().mockResolvedValue(vi.fn() as () => void),
}));

const ethereumListeners: Record<string, Array<(...args: unknown[]) => void>> = {};

describe('App Integration Tests', () => {
  const mockConnectWallet = vi.mocked(walletUtils.connectWallet);
  const mockGetTokenBalance = vi.mocked(walletUtils.getTokenBalance);
  const mockGetETHBalance = vi.mocked(walletUtils.getETHBalance);
  const mockGetTokenInfo = vi.mocked(walletUtils.getTokenInfo);
  const mockTransferTokens = vi.mocked(walletUtils.transferTokens);
  const mockSwitchNetwork = vi.mocked(walletUtils.switchNetwork);

  const STORAGE_KEY = "erc20wallet_address";
  const DISCONNECT_FLAG_KEY = "erc20wallet_disconnected";

  const mockEthereum = {
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      if (!ethereumListeners[event]) ethereumListeners[event] = [];
      ethereumListeners[event].push(handler);
    }),
    removeListener: vi.fn((event: string) => {
      delete ethereumListeners[event];
    }),
    request: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    Object.keys(ethereumListeners).forEach(key => delete ethereumListeners[key]);
    (window as unknown as Record<string, unknown>).ethereum = mockEthereum;
  });

  afterEach(() => {
    delete (window as unknown as Record<string, unknown>).ethereum;
    Object.keys(ethereumListeners).forEach(key => delete ethereumListeners[key]);
    localStorage.clear();
  });

  it('should show initial state with connect wallet prompt', () => {
    render(<App />);

    expect(screen.getByText('ERC20 Dashboard')).toBeInTheDocument();
    expect(screen.getByText('MyToken (MTK)')).toBeInTheDocument();
    expect(screen.getByText('Connect Your Wallet')).toBeInTheDocument();
    expect(
      screen.getByText(/connect your metamask wallet to view your token balance/i)
    ).toBeInTheDocument();
  });

  it('should connect wallet and display all dashboard components', async () => {
    mockConnectWallet.mockResolvedValue({
      provider: {} as import('ethers').BrowserProvider,
      signer: {} as import('ethers').Signer,
      address: '0x1234567890abcdef1234567890abcdef12345678',
      chainId: 31337,
    });

    mockGetETHBalance.mockResolvedValue('1.5');
    mockGetTokenBalance.mockResolvedValue('1000');
    mockGetTokenInfo.mockResolvedValue({
      symbol: 'MTK',
      name: 'MyToken',
      decimals: 18,
    });

    render(<App />);

    // Use getAllByText to get both buttons and click the first one (in header)
    const connectButtons = screen.getAllByText('Connect Wallet');
    fireEvent.click(connectButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('ETH Balance')).toBeInTheDocument();
      expect(screen.getByText('MyToken Balance')).toBeInTheDocument();
      expect(screen.getByText('Network: Hardhat Local')).toBeInTheDocument();
      expect(screen.getByText('Transfer Tokens')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('1.5000 ETH')).toBeInTheDocument();
      expect(screen.getByText('1000.00 MTK')).toBeInTheDocument();
    });

    expect(screen.getByTestId('status-indicator')).toHaveClass('bg-green-500');
  });

  it('should show error message when wallet connection fails', async () => {
    mockConnectWallet.mockResolvedValue({
      provider: null,
      signer: null,
      address: null,
      chainId: null,
      error: 'User rejected connection',
    });

    render(<App />);

    const connectButtons = screen.getAllByText('Connect Wallet');
    fireEvent.click(connectButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('User rejected connection')).toBeInTheDocument();
    });
  });

  it('should display network status and switch network button for unsupported networks', async () => {
    mockConnectWallet.mockResolvedValue({
      provider: {} as import('ethers').BrowserProvider,
      signer: {} as import('ethers').Signer,
      address: '0x1234567890abcdef1234567890abcdef12345678',
      chainId: 1,
    });

    mockGetETHBalance.mockResolvedValue('1.5');
    mockGetTokenBalance.mockResolvedValue('1000');
    mockGetTokenInfo.mockResolvedValue({
      symbol: 'MTK',
      name: 'MyToken',
      decimals: 18,
    });

    render(<App />);

    const connectButtons = screen.getAllByText('Connect Wallet');
    fireEvent.click(connectButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Network: Ethereum Mainnet')).toBeInTheDocument();
      expect(
        screen.getByText('Please switch to Sepolia Testnet for best experience')
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /switch to sepolia/i })).toBeInTheDocument();
    });
  });

  it('should complete full transfer flow successfully', async () => {
    mockConnectWallet.mockResolvedValue({
      provider: {} as import('ethers').BrowserProvider,
      signer: {} as import('ethers').Signer,
      address: '0x1234567890abcdef1234567890abcdef12345678',
      chainId: 31337,
    });

    mockGetETHBalance.mockResolvedValue('1.5');
    mockGetTokenBalance.mockResolvedValue('1000');
    mockGetTokenInfo.mockResolvedValue({
      symbol: 'MTK',
      name: 'MyToken',
      decimals: 18,
    });

    mockTransferTokens.mockResolvedValue({
      success: true,
      hash: '0xabc123def456',
    });

    render(<App />);

    const connectButtons = screen.getAllByText('Connect Wallet');
    fireEvent.click(connectButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('1.5000 ETH')).toBeInTheDocument();
    });

    const user = userEvent.setup();
    const toInput = screen.getByLabelText(/recipient address/i);
    const amountInput = screen.getByLabelText(/amount/i);

    await user.type(toInput, '0xabcdef1234567890abcdef1234567890abcdef12');
    await user.type(amountInput, '100');

    const transferButton = screen.getByRole('button', { name: /^transfer$/i });
    await user.click(transferButton);

    await waitFor(() => {
      expect(mockTransferTokens).toHaveBeenCalledWith(
        expect.anything(),
        '0xabcdef1234567890abcdef1234567890abcdef12',
        '100'
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Transfer successful!')).toBeInTheDocument();
      expect(screen.getByText('View on Explorer')).toHaveAttribute(
        'href',
        'https://sepolia.etherscan.io/tx/0xabc123def456'
      );
    });
  });

  it('should handle transfer error and display error message', async () => {
    mockConnectWallet.mockResolvedValue({
      provider: {} as import('ethers').BrowserProvider,
      signer: {} as import('ethers').Signer,
      address: '0x1234567890abcdef1234567890abcdef12345678',
      chainId: 31337,
    });

    mockGetETHBalance.mockResolvedValue('1.5');
    mockGetTokenBalance.mockResolvedValue('1000');
    mockGetTokenInfo.mockResolvedValue({
      symbol: 'MTK',
      name: 'MyToken',
      decimals: 18,
    });

    mockTransferTokens.mockResolvedValue({
      success: false,
      error: 'Insufficient balance',
    });

    render(<App />);

    const connectButtons = screen.getAllByText('Connect Wallet');
    fireEvent.click(connectButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('1.5000 ETH')).toBeInTheDocument();
    });

    const user = userEvent.setup();
    const toInput = screen.getByLabelText(/recipient address/i);
    const amountInput = screen.getByLabelText(/amount/i);

    await user.type(toInput, '0xabcdef1234567890abcdef1234567890abcdef12');
    await user.type(amountInput, '100');

    const transferButton = screen.getByRole('button', { name: /^transfer$/i });
    await user.click(transferButton);

    await waitFor(() => {
      expect(screen.getByText('Error: Insufficient balance')).toBeInTheDocument();
    });
  });

  it('should disconnect wallet and return to initial state', async () => {
    mockConnectWallet.mockResolvedValue({
      provider: {} as import('ethers').BrowserProvider,
      signer: {} as import('ethers').Signer,
      address: '0x1234567890abcdef1234567890abcdef12345678',
      chainId: 31337,
    });

    mockGetETHBalance.mockResolvedValue('1.5');
    mockGetTokenBalance.mockResolvedValue('1000');
    mockGetTokenInfo.mockResolvedValue({
      symbol: 'MTK',
      name: 'MyToken',
      decimals: 18,
    });

    render(<App />);

    const connectButtons = screen.getAllByText('Connect Wallet');
    fireEvent.click(connectButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('1.5000 ETH')).toBeInTheDocument();
    });

    const disconnectButton = screen.getByRole('button', { name: /disconnect/i });
    fireEvent.click(disconnectButton);

    await waitFor(() => {
      expect(mockEthereum.request).toHaveBeenCalledWith({
        method: 'wallet_revokePermissions',
        params: [{ eth_accounts: {} }],
      });
    });

    await waitFor(() => {
      expect(screen.getByText('Connect Your Wallet')).toBeInTheDocument();
      expect(screen.queryByText('ETH Balance')).not.toBeInTheDocument();
      expect(screen.queryByText('Transfer Tokens')).not.toBeInTheDocument();
    });
  });

  it('should switch network when requested', async () => {
    mockConnectWallet.mockResolvedValue({
      provider: {} as import('ethers').BrowserProvider,
      signer: {} as import('ethers').Signer,
      address: '0x1234567890abcdef1234567890abcdef12345678',
      chainId: 1,
    });

    mockGetETHBalance.mockResolvedValue('1.5');
    mockGetTokenBalance.mockResolvedValue('1000');
    mockGetTokenInfo.mockResolvedValue({
      symbol: 'MTK',
      name: 'MyToken',
      decimals: 18,
    });

    mockSwitchNetwork.mockResolvedValue({ success: true });

    render(<App />);

    const connectButtons = screen.getAllByText('Connect Wallet');
    fireEvent.click(connectButtons[0]);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /switch to sepolia/i })).toBeInTheDocument();
    });

    const switchButton = screen.getByRole('button', { name: /switch to sepolia/i });
    fireEvent.click(switchButton);

    await waitFor(() => {
      expect(mockSwitchNetwork).toHaveBeenCalledWith(11155111);
    });
  });

  it('should dismiss error message when close button is clicked', async () => {
    mockConnectWallet.mockResolvedValue({
      provider: null,
      signer: null,
      address: null,
      chainId: null,
      error: 'Connection failed',
    });

    render(<App />);

    const connectButtons = screen.getAllByText('Connect Wallet');
    fireEvent.click(connectButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Connection failed')).toBeInTheDocument();
    });

    // Use aria-label to target the close button specifically
    const closeButton = screen.getByRole('button', { name: /close|dismiss|cancel/i });
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByText('Connection failed')).not.toBeInTheDocument();
    });
  });

  it('should refresh balances after successful transfer', async () => {
    mockConnectWallet.mockResolvedValue({
      provider: {} as import('ethers').BrowserProvider,
      signer: {} as import('ethers').Signer,
      address: '0x1234567890abcdef1234567890abcdef12345678',
      chainId: 31337,
    });

    mockGetETHBalance.mockResolvedValue('1.5');
    mockGetTokenBalance.mockResolvedValue('1000');
    mockGetTokenInfo.mockResolvedValue({
      symbol: 'MTK',
      name: 'MyToken',
      decimals: 18,
    });

    mockTransferTokens.mockResolvedValue({
      success: true,
      hash: '0xabc123',
    });

    render(<App />);

    const connectButtons = screen.getAllByText('Connect Wallet');
    fireEvent.click(connectButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('1.5000 ETH')).toBeInTheDocument();
    });

    // Verify initial balance was fetched
    expect(mockGetTokenBalance).toHaveBeenCalledTimes(1);

    // Perform transfer
    const user = userEvent.setup();
    const toInput = screen.getByLabelText(/recipient address/i);
    const amountInput = screen.getByLabelText(/amount/i);

    await user.type(toInput, '0xabcdef1234567890abcdef1234567890abcdef12');
    await user.type(amountInput, '100');

    const transferButton = screen.getByRole('button', { name: /^transfer$/i });
    await user.click(transferButton);

    await waitFor(() => {
      expect(mockTransferTokens).toHaveBeenCalled();
    });

    // Verify balances were refreshed after transfer
    await waitFor(() => {
      expect(mockGetTokenBalance).toHaveBeenCalledTimes(2);
    });
  });

  it('should not auto-reconnect after explicit disconnect', async () => {
    mockConnectWallet.mockResolvedValue({
      provider: {} as import('ethers').BrowserProvider,
      signer: {} as import('ethers').Signer,
      address: '0x1234567890abcdef1234567890abcdef12345678',
      chainId: 31337,
    });

    mockGetETHBalance.mockResolvedValue('1.5');
    mockGetTokenBalance.mockResolvedValue('1000');
    mockGetTokenInfo.mockResolvedValue({
      symbol: 'MTK',
      name: 'MyToken',
      decimals: 18,
    });

    render(<App />);

    const connectButtons = screen.getAllByText('Connect Wallet');
    fireEvent.click(connectButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('1.5000 ETH')).toBeInTheDocument();
    });

    const disconnectButton = screen.getByRole('button', { name: /disconnect/i });
    fireEvent.click(disconnectButton);

    await waitFor(() => {
      expect(screen.getByText('Connect Your Wallet')).toBeInTheDocument();
    });

    expect(localStorage.getItem(DISCONNECT_FLAG_KEY)).toBe('1');

    vi.clearAllMocks();
    render(<App />);

    expect(screen.queryAllByText('Connect Your Wallet').length).toBeGreaterThan(0);
    expect(mockConnectWallet).not.toHaveBeenCalled();
  });

  it('should clear disconnect flag when connecting again after disconnect', async () => {
    localStorage.setItem(DISCONNECT_FLAG_KEY, '1');

    mockConnectWallet.mockResolvedValue({
      provider: {} as import('ethers').BrowserProvider,
      signer: {} as import('ethers').Signer,
      address: '0x1234567890abcdef1234567890abcdef12345678',
      chainId: 31337,
    });

    mockGetETHBalance.mockResolvedValue('1.5');
    mockGetTokenBalance.mockResolvedValue('1000');
    mockGetTokenInfo.mockResolvedValue({
      symbol: 'MTK',
      name: 'MyToken',
      decimals: 18,
    });

    render(<App />);

    const connectButtons = screen.getAllByText('Connect Wallet');
    fireEvent.click(connectButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('1.5000 ETH')).toBeInTheDocument();
    });

    expect(localStorage.getItem(DISCONNECT_FLAG_KEY)).toBeNull();
  });

  it('should persist address in localStorage after successful connection', async () => {
    mockConnectWallet.mockResolvedValue({
      provider: {} as import('ethers').BrowserProvider,
      signer: {} as import('ethers').Signer,
      address: '0x1234567890abcdef1234567890abcdef12345678',
      chainId: 31337,
    });

    mockGetETHBalance.mockResolvedValue('1.5');
    mockGetTokenBalance.mockResolvedValue('1000');
    mockGetTokenInfo.mockResolvedValue({
      symbol: 'MTK',
      name: 'MyToken',
      decimals: 18,
    });

    render(<App />);

    const connectButtons = screen.getAllByText('Connect Wallet');
    fireEvent.click(connectButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('1.5000 ETH')).toBeInTheDocument();
    });

    expect(localStorage.getItem(STORAGE_KEY)).toBe('0x1234567890abcdef1234567890abcdef12345678');
  });

  it('should auto-reconnect on page reload if previously connected without explicit disconnect', async () => {
    mockConnectWallet.mockResolvedValue({
      provider: {} as import('ethers').BrowserProvider,
      signer: {} as import('ethers').Signer,
      address: '0x1234567890abcdef1234567890abcdef12345678',
      chainId: 31337,
    });

    mockGetETHBalance.mockResolvedValue('1.5');
    mockGetTokenBalance.mockResolvedValue('1000');
    mockGetTokenInfo.mockResolvedValue({
      symbol: 'MTK',
      name: 'MyToken',
      decimals: 18,
    });

    vi.clearAllMocks();

    localStorage.setItem(STORAGE_KEY, '0x1234567890abcdef1234567890abcdef12345678');

    const mockEth = window.ethereum as unknown as { request: ReturnType<typeof vi.fn> };
    mockEth.request = vi.fn().mockResolvedValue(['0x1234567890abcdef1234567890abcdef12345678']);

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('1.5000 ETH')).toBeInTheDocument();
    });

    expect(mockConnectWallet).toHaveBeenCalled();
  });

  it('should show loading state on Connect button when clicked', async () => {
    // Make connectWallet slow to verify loading state
    let resolveConnect: (value: {
      provider: import('ethers').BrowserProvider;
      signer: import('ethers').Signer;
      address: string;
      chainId: number;
    }) => void = null!;

    mockConnectWallet.mockImplementation(() => new Promise((resolve) => {
      resolveConnect = () => resolve({
        provider: {} as import('ethers').BrowserProvider,
        signer: {} as import('ethers').Signer,
        address: '0x1234567890abcdef1234567890abcdef12345678',
        chainId: 31337,
      });
    }));

    mockGetETHBalance.mockResolvedValue('1.5');
    mockGetTokenBalance.mockResolvedValue('1000');
    mockGetTokenInfo.mockResolvedValue({
      symbol: 'MTK',
      name: 'MyToken',
      decimals: 18,
    });

    render(<App />);

    const connectButtons = screen.getAllByText('Connect Wallet');
    fireEvent.click(connectButtons[0]);

    // Should show "Connecting..." text immediately after click
    await waitFor(() => {
      expect(screen.getAllByText('Connecting...').length).toBe(2); // Both header and main button
    });

    // Buttons should be disabled
    const buttons = screen.getAllByRole('button', { name: /connecting/i });
    buttons.forEach(button => {
      expect(button).toBeDisabled();
    });

    // Resolve the connection
    resolveConnect({
      provider: {} as import('ethers').BrowserProvider,
      signer: {} as import('ethers').Signer,
      address: '0x1234567890abcdef1234567890abcdef12345678',
      chainId: 31337,
    });

    await waitFor(() => {
      expect(screen.getByText('1.5000 ETH')).toBeInTheDocument();
    });
  });

  it('should call connectWallet with false for auto-connect and true for manual connect', async () => {
    mockConnectWallet.mockResolvedValue({
      provider: {} as import('ethers').BrowserProvider,
      signer: {} as import('ethers').Signer,
      address: '0x1234567890abcdef1234567890abcdef12345678',
      chainId: 31337,
    });

    mockGetETHBalance.mockResolvedValue('1.5');
    mockGetTokenBalance.mockResolvedValue('1000');
    mockGetTokenInfo.mockResolvedValue({
      symbol: 'MTK',
      name: 'MyToken',
      decimals: 18,
    });

    // Clear and setup for auto-connect test (no disconnect flag, has accounts in MetaMask)
    vi.clearAllMocks();
    localStorage.clear();

    const mockEth = window.ethereum as unknown as { request: ReturnType<typeof vi.fn> };
    mockEth.request = vi.fn().mockResolvedValue(['0x1234567890abcdef1234567890abcdef12345678']);

    render(<App />);

    // Auto-connect should be called with false (no popup)
    await waitFor(() => {
      expect(mockConnectWallet).toHaveBeenCalledWith(false);
    });

    // Disconnect first
    const disconnectButton = screen.getByRole('button', { name: /disconnect/i });
    fireEvent.click(disconnectButton);

    await waitFor(() => {
      expect(screen.getByText('Connect Your Wallet')).toBeInTheDocument();
    });

    vi.clearAllMocks();

    // Now click Connect button - should be called with no argument (defaults to true = with popup)
    const connectButtons = screen.getAllByText('Connect Wallet');
    fireEvent.click(connectButtons[0]);

    await waitFor(() => {
      // connectWallet() should be called (without false argument)
      expect(mockConnectWallet).toHaveBeenCalled();
      // The first call should NOT have false as the argument (should be default true or undefined)
      const callArgs = mockConnectWallet.mock.calls[0];
      expect(callArgs[0]).not.toBe(false);
    });
  });

  it('should display error when fetching wallet info fails', async () => {
    mockConnectWallet.mockResolvedValue({
      provider: {} as import('ethers').BrowserProvider,
      signer: {} as import('ethers').Signer,
      address: '0x1234567890abcdef1234567890abcdef12345678',
      chainId: 31337,
    });

    mockGetETHBalance.mockRejectedValue(new Error('RPC error'));
    mockGetTokenBalance.mockResolvedValue('1000');
    mockGetTokenInfo.mockResolvedValue({
      symbol: 'MTK', name: 'MyToken', decimals: 18,
    });

    render(<App />);

    const connectButtons = screen.getAllByText('Connect Wallet');
    fireEvent.click(connectButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Failed to fetch wallet information')).toBeInTheDocument();
    });
  });

  it('should display error when network switch fails', async () => {
    mockConnectWallet.mockResolvedValue({
      provider: {} as import('ethers').BrowserProvider,
      signer: {} as import('ethers').Signer,
      address: '0x1234567890abcdef1234567890abcdef12345678',
      chainId: 1,
    });

    mockGetETHBalance.mockResolvedValue('1.5');
    mockGetTokenBalance.mockResolvedValue('1000');
    mockGetTokenInfo.mockResolvedValue({
      symbol: 'MTK', name: 'MyToken', decimals: 18,
    });

    mockSwitchNetwork.mockResolvedValue({ success: false, error: 'User rejected network switch' });

    render(<App />);

    const connectButtons = screen.getAllByText('Connect Wallet');
    fireEvent.click(connectButtons[0]);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /switch to sepolia/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /switch to sepolia/i }));

    await waitFor(() => {
      expect(screen.getByText('User rejected network switch')).toBeInTheDocument();
    });
  });

  it('should not auto-connect when MetaMask has no accounts', async () => {
    localStorage.setItem(STORAGE_KEY, '0x1234567890abcdef1234567890abcdef12345678');

    const mockEth = window.ethereum as unknown as { request: ReturnType<typeof vi.fn> };
    mockEth.request = vi.fn().mockResolvedValue([]);

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Connect Your Wallet')).toBeInTheDocument();
    });

    expect(mockConnectWallet).not.toHaveBeenCalled();
    expect(localStorage.getItem(DISCONNECT_FLAG_KEY)).toBe('1');
  });

  it('should handle auto-connect error gracefully', async () => {
    localStorage.setItem(STORAGE_KEY, '0x1234567890abcdef1234567890abcdef12345678');

    const mockEth = window.ethereum as unknown as { request: ReturnType<typeof vi.fn> };
    mockEth.request = vi.fn().mockRejectedValue(new Error('MetaMask locked'));

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Connect Your Wallet')).toBeInTheDocument();
    });

    expect(localStorage.getItem(DISCONNECT_FLAG_KEY)).toBe('1');
  });

  it('should disconnect when MetaMask accounts are removed', async () => {
    mockConnectWallet.mockResolvedValue({
      provider: {} as import('ethers').BrowserProvider,
      signer: {} as import('ethers').Signer,
      address: '0x1234567890abcdef1234567890abcdef12345678',
      chainId: 31337,
    });

    mockGetETHBalance.mockResolvedValue('1.5');
    mockGetTokenBalance.mockResolvedValue('1000');
    mockGetTokenInfo.mockResolvedValue({
      symbol: 'MTK', name: 'MyToken', decimals: 18,
    });

    render(<App />);

    const connectButtons = screen.getAllByText('Connect Wallet');
    fireEvent.click(connectButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('1.5000 ETH')).toBeInTheDocument();
    });

    const handler = ethereumListeners['accountsChanged']?.[0];
    act(() => { handler([]); });

    await waitFor(() => {
      expect(screen.getByText('Connect Your Wallet')).toBeInTheDocument();
    });
  });

  it('should update wallet info when MetaMask account changes', async () => {
    mockConnectWallet.mockResolvedValue({
      provider: {} as import('ethers').BrowserProvider,
      signer: {} as import('ethers').Signer,
      address: '0x1234567890abcdef1234567890abcdef12345678',
      chainId: 31337,
    });

    mockGetETHBalance.mockResolvedValue('1.5');
    mockGetTokenBalance.mockResolvedValue('1000');
    mockGetTokenInfo.mockResolvedValue({
      symbol: 'MTK', name: 'MyToken', decimals: 18,
    });

    render(<App />);

    const connectButtons = screen.getAllByText('Connect Wallet');
    fireEvent.click(connectButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('1.5000 ETH')).toBeInTheDocument();
    });

    const initialCalls = mockGetTokenBalance.mock.calls.length;

    const handler = ethereumListeners['accountsChanged']?.[0];
    await act(async () => {
      await handler(['0xnewaddress1234567890abcdef1234567890abcdef12']);
    });

    await waitFor(() => {
      expect(mockGetTokenBalance.mock.calls.length).toBeGreaterThan(initialCalls);
    });
  });

  it('should update when chain changes', async () => {
    mockConnectWallet.mockResolvedValue({
      provider: {} as import('ethers').BrowserProvider,
      signer: {} as import('ethers').Signer,
      address: '0x1234567890abcdef1234567890abcdef12345678',
      chainId: 31337,
    });

    mockGetETHBalance.mockResolvedValue('1.5');
    mockGetTokenBalance.mockResolvedValue('1000');
    mockGetTokenInfo.mockResolvedValue({
      symbol: 'MTK', name: 'MyToken', decimals: 18,
    });

    render(<App />);

    const connectButtons = screen.getAllByText('Connect Wallet');
    fireEvent.click(connectButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Network: Hardhat Local')).toBeInTheDocument();
    });

    const initialCalls = mockGetTokenBalance.mock.calls.length;

    const handler = ethereumListeners['chainChanged']?.[0];
    await act(async () => {
      await handler('0xaa36a7');
    });

    await waitFor(() => {
      expect(screen.getByText('Network: Sepolia Testnet')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(mockGetTokenBalance.mock.calls.length).toBeGreaterThan(initialCalls);
    });
  });

  it('should refresh wallet info on MetaMask message event', async () => {
    mockConnectWallet.mockResolvedValue({
      provider: {} as import('ethers').BrowserProvider,
      signer: {} as import('ethers').Signer,
      address: '0x1234567890abcdef1234567890abcdef12345678',
      chainId: 31337,
    });

    mockGetETHBalance.mockResolvedValue('1.5');
    mockGetTokenBalance.mockResolvedValue('1000');
    mockGetTokenInfo.mockResolvedValue({
      symbol: 'MTK', name: 'MyToken', decimals: 18,
    });

    render(<App />);

    const connectButtons = screen.getAllByText('Connect Wallet');
    fireEvent.click(connectButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('1.5000 ETH')).toBeInTheDocument();
    });

    const initialCalls = mockGetTokenBalance.mock.calls.length;

    const handler = ethereumListeners['message']?.[0];
    await act(async () => {
      await handler();
    });

    await waitFor(() => {
      expect(mockGetTokenBalance.mock.calls.length).toBeGreaterThan(initialCalls);
    });
  });

  it('should show error when transfer signer cannot be obtained', async () => {
    mockConnectWallet
      .mockResolvedValueOnce({
        provider: {} as import('ethers').BrowserProvider,
        signer: {} as import('ethers').Signer,
        address: '0x1234567890abcdef1234567890abcdef12345678',
        chainId: 31337,
      })
      .mockResolvedValue({ provider: null, signer: null, address: null, chainId: null, error: 'Signer unavailable' });

    mockGetETHBalance.mockResolvedValue('1.5');
    mockGetTokenBalance.mockResolvedValue('1000');
    mockGetTokenInfo.mockResolvedValue({
      symbol: 'MTK', name: 'MyToken', decimals: 18,
    });

    render(<App />);

    const connectButtons = screen.getAllByText('Connect Wallet');
    fireEvent.click(connectButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('1.5000 ETH')).toBeInTheDocument();
    });

    const user = userEvent.setup();
    const toInput = screen.getByLabelText(/recipient address/i);
    const amountInput = screen.getByLabelText(/amount/i);

    await user.type(toInput, '0xabcdef1234567890abcdef1234567890abcdef12');
    await user.type(amountInput, '100');

    const transferButton = screen.getByRole('button', { name: /^transfer$/i });
    await user.click(transferButton);

    await waitFor(() => {
      expect(screen.getByText('Error: Signer unavailable')).toBeInTheDocument();
    });
  });

  it('should handle localStorage unavailable gracefully', async () => {
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('localStorage unavailable');
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Connect Your Wallet')).toBeInTheDocument();
    });

    getItemSpy.mockRestore();
  });

  it('should refresh balances when token transfer event is detected', async () => {
    let transferCb: () => void = null!;
    const mockWatch = vi.mocked(walletUtils.watchTokenTransfers);
    mockWatch.mockImplementation(async (...args: unknown[]) => {
      transferCb = args[2] as () => void;
      return vi.fn() as () => void;
    });

    mockConnectWallet.mockResolvedValue({
      provider: {} as import('ethers').BrowserProvider,
      signer: {} as import('ethers').Signer,
      address: '0x1234567890abcdef1234567890abcdef12345678',
      chainId: 31337,
    });

    mockGetETHBalance.mockResolvedValue('1.5');
    mockGetTokenBalance.mockResolvedValue('1000');
    mockGetTokenInfo.mockResolvedValue({
      symbol: 'MTK', name: 'MyToken', decimals: 18,
    });

    render(<App />);

    const connectButtons = screen.getAllByText('Connect Wallet');
    fireEvent.click(connectButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('1.5000 ETH')).toBeInTheDocument();
    });

    expect(mockGetTokenBalance).toHaveBeenCalledTimes(1);

    await act(async () => {
      await transferCb();
    });

    await waitFor(() => {
      expect(mockGetTokenBalance).toHaveBeenCalledTimes(2);
    });
  });

  it('should call getNetwork then handler in token transfer callback when provider succeeds', async () => {
    const mockEth = window.ethereum as unknown as { request: ReturnType<typeof vi.fn> };
    mockEth.request = vi.fn().mockImplementation(async (params: { method: string }) => {
      if (params.method === 'eth_chainId') return '0x7a69';
      return undefined;
    });

    let transferCb: () => void = null!;
    const mockWatch = vi.mocked(walletUtils.watchTokenTransfers);
    mockWatch.mockImplementation(async (...args: unknown[]) => {
      transferCb = args[2] as () => void;
      return vi.fn() as () => void;
    });

    mockConnectWallet.mockResolvedValue({
      provider: {} as import('ethers').BrowserProvider,
      signer: {} as import('ethers').Signer,
      address: '0x1234567890abcdef1234567890abcdef12345678',
      chainId: 31337,
    });

    mockGetETHBalance.mockResolvedValue('1.5');
    mockGetTokenBalance.mockResolvedValue('1000');
    mockGetTokenInfo.mockResolvedValue({
      symbol: 'MTK', name: 'MyToken', decimals: 18,
    });

    render(<App />);

    const connectButtons = screen.getAllByText('Connect Wallet');
    fireEvent.click(connectButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('1.5000 ETH')).toBeInTheDocument();
    });

    expect(mockGetTokenBalance).toHaveBeenCalledTimes(1);

    await act(async () => {
      await transferCb();
    });

    await waitFor(() => {
      expect(mockGetTokenBalance).toHaveBeenCalledTimes(2);
    });
  });

  it('should handle missing MetaMask gracefully', () => {
    delete (window as unknown as Record<string, unknown>).ethereum;

    render(<App />);

    expect(screen.getByText('Connect Your Wallet')).toBeInTheDocument();
    expect(mockConnectWallet).not.toHaveBeenCalled();
  });

  it('should disconnect even when revokePermissions fails', async () => {
    mockEthereum.request.mockRejectedValue(new Error('Not supported'));

    mockConnectWallet.mockResolvedValue({
      provider: {} as import('ethers').BrowserProvider,
      signer: {} as import('ethers').Signer,
      address: '0x1234567890abcdef1234567890abcdef12345678',
      chainId: 31337,
    });

    mockGetETHBalance.mockResolvedValue('1.5');
    mockGetTokenBalance.mockResolvedValue('1000');
    mockGetTokenInfo.mockResolvedValue({
      symbol: 'MTK', name: 'MyToken', decimals: 18,
    });

    render(<App />);

    const connectButtons = screen.getAllByText('Connect Wallet');
    fireEvent.click(connectButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('1.5000 ETH')).toBeInTheDocument();
    });

    const disconnectButton = screen.getByRole('button', { name: /disconnect/i });
    fireEvent.click(disconnectButton);

    await waitFor(() => {
      expect(screen.getByText('Connect Your Wallet')).toBeInTheDocument();
    });
  });

  it('should prevent double connection attempt', async () => {
    let resolveConnect: ((value: { provider: import('ethers').BrowserProvider | null; signer: import('ethers').Signer | null; address: string | null; chainId: number | null; error?: string }) => void) | null = null;
    mockConnectWallet.mockImplementation(() => new Promise((resolve) => {
      resolveConnect = resolve as typeof resolveConnect;
    }));

    mockGetETHBalance.mockResolvedValue('1.5');
    mockGetTokenBalance.mockResolvedValue('1000');
    mockGetTokenInfo.mockResolvedValue({
      symbol: 'MTK', name: 'MyToken', decimals: 18,
    });

    render(<App />);

    const connectButtons = screen.getAllByText('Connect Wallet');

    await act(async () => {
      fireEvent.click(connectButtons[0]);
      fireEvent.click(connectButtons[0]);
    });

    expect(mockConnectWallet).toHaveBeenCalledTimes(1);

    resolveConnect!({
      provider: {} as import('ethers').BrowserProvider,
      signer: {} as import('ethers').Signer,
      address: '0x1234567890abcdef1234567890abcdef12345678',
      chainId: 31337,
    });

    await waitFor(() => {
      expect(screen.getByText('1.5000 ETH')).toBeInTheDocument();
    });
  });

  it('should call getNetwork then handler when provider request succeeds', async () => {
    const mockEth = window.ethereum as unknown as { request: ReturnType<typeof vi.fn> };
    mockEth.request = vi.fn().mockImplementation(async (params: { method: string }) => {
      if (params.method === 'eth_chainId') return '0x7a69';
      return undefined;
    });

    mockConnectWallet
      .mockResolvedValueOnce({
        provider: {} as import('ethers').BrowserProvider,
        signer: {} as import('ethers').Signer,
        address: '0x1234567890abcdef1234567890abcdef12345678',
        chainId: 31337,
      });

    mockGetETHBalance.mockResolvedValue('1.5');
    mockGetTokenBalance.mockResolvedValue('1000');
    mockGetTokenInfo.mockResolvedValue({
      symbol: 'MTK', name: 'MyToken', decimals: 18,
    });

    render(<App />);

    const connectButtons = screen.getAllByText('Connect Wallet');
    fireEvent.click(connectButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('1.5000 ETH')).toBeInTheDocument();
    });

    const handler = ethereumListeners['accountsChanged']?.[0];
    await act(async () => {
      await handler(['0xnewaddress1234567890abcdef1234567890abcdef12']);
    });

    await waitFor(() => {
      expect(mockGetTokenBalance.mock.calls.length).toBeGreaterThan(1);
    });
  });

  it('should skip balance refresh after transfer when provider is null', async () => {
    mockConnectWallet
      .mockResolvedValueOnce({
        provider: {} as import('ethers').BrowserProvider,
        signer: {} as import('ethers').Signer,
        address: '0x1234567890abcdef1234567890abcdef12345678',
        chainId: 31337,
      })
      .mockResolvedValueOnce({
        provider: null,
        signer: {} as import('ethers').Signer,
        address: '0x1234567890abcdef1234567890abcdef12345678',
        chainId: 31337,
      });

    mockGetETHBalance.mockResolvedValue('1.5');
    mockGetTokenBalance.mockResolvedValue('1000');
    mockGetTokenInfo.mockResolvedValue({
      symbol: 'MTK', name: 'MyToken', decimals: 18,
    });
    mockTransferTokens.mockResolvedValue({ success: true, hash: '0xabc' });

    render(<App />);

    const connectButtons = screen.getAllByText('Connect Wallet');
    fireEvent.click(connectButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('1.5000 ETH')).toBeInTheDocument();
    });

    const initialCalls = mockGetTokenBalance.mock.calls.length;

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/recipient address/i), '0xabcdef1234567890abcdef1234567890abcdef12');
    await user.type(screen.getByLabelText(/amount/i), '100');

    const transferButton = screen.getByRole('button', { name: /^transfer$/i });
    await user.click(transferButton);

    await waitFor(() => {
      expect(screen.getByText('Transfer successful!')).toBeInTheDocument();
    });

    expect(mockGetTokenBalance.mock.calls.length).toBe(initialCalls);
  });

  it('should handle connect returning partial result without error', async () => {
    mockConnectWallet.mockResolvedValue({
      provider: null,
      signer: null,
      address: null,
      chainId: null,
    });

    render(<App />);

    const connectButtons = screen.getAllByText('Connect Wallet');
    fireEvent.click(connectButtons[0]);

    await waitFor(() => {
      expect(screen.getAllByText('Connect Wallet').length).toBeGreaterThan(0);
    });
  });

  it('should disconnect without ethereum defined', async () => {
    delete (window as unknown as Record<string, unknown>).ethereum;

    mockConnectWallet.mockResolvedValue({
      provider: {} as import('ethers').BrowserProvider,
      signer: {} as import('ethers').Signer,
      address: '0x1234567890abcdef1234567890abcdef12345678',
      chainId: 31337,
    });

    mockGetETHBalance.mockResolvedValue('1.5');
    mockGetTokenBalance.mockResolvedValue('1000');
    mockGetTokenInfo.mockResolvedValue({
      symbol: 'MTK', name: 'MyToken', decimals: 18,
    });

    render(<App />);

    const connectButtons = screen.getAllByText('Connect Wallet');
    fireEvent.click(connectButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('1.5000 ETH')).toBeInTheDocument();
    });

    const disconnectButton = screen.getByRole('button', { name: /disconnect/i });
    fireEvent.click(disconnectButton);

    await waitFor(() => {
      expect(screen.getByText('Connect Your Wallet')).toBeInTheDocument();
    });
  });

  it('should handle switch network failure without error message', async () => {
    mockConnectWallet.mockResolvedValue({
      provider: {} as import('ethers').BrowserProvider,
      signer: {} as import('ethers').Signer,
      address: '0x1234567890abcdef1234567890abcdef12345678',
      chainId: 1,
    });

    mockGetETHBalance.mockResolvedValue('1.5');
    mockGetTokenBalance.mockResolvedValue('1000');
    mockGetTokenInfo.mockResolvedValue({
      symbol: 'MTK', name: 'MyToken', decimals: 18,
    });

    mockSwitchNetwork.mockResolvedValue({ success: false });

    render(<App />);

    const connectButtons = screen.getAllByText('Connect Wallet');
    fireEvent.click(connectButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Network: Ethereum Mainnet')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /switch to sepolia/i }));

    await waitFor(() => {
      expect(screen.getByText('Failed to switch network')).toBeInTheDocument();
    });
  });

  it('should not update on accountsChanged with same address', async () => {
    mockConnectWallet.mockResolvedValue({
      provider: {} as import('ethers').BrowserProvider,
      signer: {} as import('ethers').Signer,
      address: '0x1234567890abcdef1234567890abcdef12345678',
      chainId: 31337,
    });

    mockGetETHBalance.mockResolvedValue('1.5');
    mockGetTokenBalance.mockResolvedValue('1000');
    mockGetTokenInfo.mockResolvedValue({
      symbol: 'MTK', name: 'MyToken', decimals: 18,
    });

    render(<App />);

    const connectButtons = screen.getAllByText('Connect Wallet');
    fireEvent.click(connectButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('1.5000 ETH')).toBeInTheDocument();
    });

    const initialCalls = mockGetTokenBalance.mock.calls.length;

    const handler = ethereumListeners['accountsChanged']?.[0];
    await act(async () => {
      await handler(['0x1234567890abcdef1234567890abcdef12345678']);
    });

    await waitFor(() => {
      expect(mockGetTokenBalance.mock.calls.length).toBe(initialCalls);
    });
  });

  it('should skip provider creation when ethereum is removed after connect', async () => {
    mockConnectWallet.mockResolvedValue({
      provider: {} as import('ethers').BrowserProvider,
      signer: {} as import('ethers').Signer,
      address: '0x1234567890abcdef1234567890abcdef12345678',
      chainId: 31337,
    });

    mockGetETHBalance.mockResolvedValue('1.5');
    mockGetTokenBalance.mockResolvedValue('1000');
    mockGetTokenInfo.mockResolvedValue({
      symbol: 'MTK', name: 'MyToken', decimals: 18,
    });

    render(<App />);

    const connectButtons = screen.getAllByText('Connect Wallet');
    fireEvent.click(connectButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('1.5000 ETH')).toBeInTheDocument();
    });

    delete (window as unknown as Record<string, unknown>).ethereum;

    const accountsHandler = ethereumListeners['accountsChanged']?.[0];
    await act(async () => {
      await accountsHandler(['0xnewaddress1234567890abcdef1234567890abcdef12']);
    });

    const chainHandler = ethereumListeners['chainChanged']?.[0];
    await act(async () => {
      await chainHandler('0xaa36a7');
    });

    const messageHandler = ethereumListeners['message']?.[0];
    await act(async () => {
      await messageHandler();
    });
  });

  it('should handle partial auto-connect result without full wallet state', async () => {
    localStorage.setItem(STORAGE_KEY, '0x1234567890abcdef1234567890abcdef12345678');

    const mockEth = window.ethereum as unknown as { request: ReturnType<typeof vi.fn> };
    mockEth.request = vi.fn().mockResolvedValue(['0x1234567890abcdef1234567890abcdef12345678']);

    mockConnectWallet.mockResolvedValue({
      provider: null,
      signer: null,
      address: null,
      chainId: null,
    });

    mockGetETHBalance.mockResolvedValue('1.5');
    mockGetTokenBalance.mockResolvedValue('1000');
    mockGetTokenInfo.mockResolvedValue({
      symbol: 'MTK', name: 'MyToken', decimals: 18,
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Connect Your Wallet')).toBeInTheDocument();
    });
  });

  it('should update address on accountsChanged without connecting', async () => {
    render(<App />);

    expect(screen.getByText('Connect Your Wallet')).toBeInTheDocument();

    const handler = ethereumListeners['accountsChanged']?.[0];
    await act(async () => {
      await handler(['0xnewaddress1234567890abcdef1234567890abcdef12']);
    });

    expect(screen.getByText('Connect Your Wallet')).toBeInTheDocument();
  });

  it('should handle transfer with null signer', async () => {
    mockConnectWallet
      .mockResolvedValueOnce({
        provider: {} as import('ethers').BrowserProvider,
        signer: {} as import('ethers').Signer,
        address: '0x1234567890abcdef1234567890abcdef12345678',
        chainId: 31337,
      })
      .mockResolvedValueOnce({
        provider: null,
        signer: null,
        address: null,
        chainId: null,
      });

    mockGetETHBalance.mockResolvedValue('1.5');
    mockGetTokenBalance.mockResolvedValue('1000');
    mockGetTokenInfo.mockResolvedValue({
      symbol: 'MTK', name: 'MyToken', decimals: 18,
    });

    render(<App />);

    const connectButtons = screen.getAllByText('Connect Wallet');
    fireEvent.click(connectButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('1.5000 ETH')).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/recipient address/i), '0xabcdef1234567890abcdef1234567890abcdef12');
    await user.type(screen.getByLabelText(/amount/i), '100');

    const transferButton = screen.getByRole('button', { name: /^transfer$/i });
    await user.click(transferButton);

    await waitFor(() => {
      expect(screen.getByText('Error: Failed to connect wallet')).toBeInTheDocument();
    });
  });

  it('should skip balance refresh when chainChanged fires before connecting', async () => {
    const mockEth = window.ethereum as unknown as { request: ReturnType<typeof vi.fn> };
    mockEth.request = vi.fn().mockImplementation(async (params: { method: string }) => {
      if (params.method === 'eth_accounts') return [];
      return undefined;
    });

    mockConnectWallet.mockResolvedValue({
      provider: {} as import('ethers').BrowserProvider,
      signer: {} as import('ethers').Signer,
      address: '0x1234567890abcdef1234567890abcdef12345678',
      chainId: 31337,
    });

    mockGetETHBalance.mockResolvedValue('1.5');
    mockGetTokenBalance.mockResolvedValue('1000');
    mockGetTokenInfo.mockResolvedValue({
      symbol: 'MTK', name: 'MyToken', decimals: 18,
    });

    render(<App />);

    expect(screen.getByText('Connect Your Wallet')).toBeInTheDocument();

    const initialCalls = mockGetTokenBalance.mock.calls.length;

    const chainHandler = ethereumListeners['chainChanged']?.[0];
    await act(async () => {
      await chainHandler('0xaa36a7');
    });

    expect(mockGetTokenBalance.mock.calls.length).toBe(initialCalls);
  });

  it('should handle unwatch undefined and isMounted false in transfer callback', async () => {
    const mockEth = window.ethereum as unknown as { request: ReturnType<typeof vi.fn> };
    mockEth.request = vi.fn().mockImplementation(async (params: { method: string }) => {
      if (params.method === 'eth_accounts') return [];
      return undefined;
    });

    let watchResolve: (value: () => void) => void;
    const mockWatch = vi.mocked(walletUtils.watchTokenTransfers);

    let transferCb: () => void = null!;
    mockWatch.mockImplementation(async (...args: unknown[]) => {
      transferCb = args[2] as () => void;
      return new Promise<() => void>((resolve) => {
        watchResolve = resolve;
      });
    });

    mockConnectWallet.mockResolvedValue({
      provider: {} as import('ethers').BrowserProvider,
      signer: {} as import('ethers').Signer,
      address: '0x1234567890abcdef1234567890abcdef12345678',
      chainId: 31337,
    });

    mockGetETHBalance.mockResolvedValue('1.5');
    mockGetTokenBalance.mockResolvedValue('1000');
    mockGetTokenInfo.mockResolvedValue({
      symbol: 'MTK', name: 'MyToken', decimals: 18,
    });

    const { unmount } = render(<App />);

    const connectButtons = screen.getAllByText('Connect Wallet');
    fireEvent.click(connectButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('1.5000 ETH')).toBeInTheDocument();
    });

    const callsAfterConnect = mockGetTokenBalance.mock.calls.length;

    await act(async () => {
      await transferCb();
    });

    expect(mockGetTokenBalance.mock.calls.length).toBeGreaterThan(callsAfterConnect);

    // Cleanup runs: isMounted = false, unwatch is undefined
    // Covers the false branch of `if (unwatch)` at line 291
    await act(async () => {
      unmount();
    });

    // Now isMounted is false — covers the false branch of `if (isMounted)` at line 275
    await act(async () => {
      await transferCb();
    });

    // Balance should NOT have been refreshed (isMounted was false)
    expect(mockGetTokenBalance.mock.calls.length).toBe(callsAfterConnect + 1);

    // Clean up the pending promise
    watchResolve!(vi.fn());
  });
});
