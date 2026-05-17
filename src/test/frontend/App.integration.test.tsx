import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
  watchTokenTransfers: vi.fn().mockResolvedValue(vi.fn()),
}));

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
    on: vi.fn(),
    removeListener: vi.fn(),
    request: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    (window as unknown as Record<string, unknown>).ethereum = mockEthereum;
  });

  afterEach(() => {
    delete (window as unknown as Record<string, unknown>).ethereum;
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
});
