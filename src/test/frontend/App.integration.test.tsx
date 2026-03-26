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
}));

describe('App Integration Tests', () => {
  const mockConnectWallet = vi.mocked(walletUtils.connectWallet);
  const mockGetTokenBalance = vi.mocked(walletUtils.getTokenBalance);
  const mockGetETHBalance = vi.mocked(walletUtils.getETHBalance);
  const mockGetTokenInfo = vi.mocked(walletUtils.getTokenInfo);
  const mockTransferTokens = vi.mocked(walletUtils.transferTokens);
  const mockSwitchNetwork = vi.mocked(walletUtils.switchNetwork);

  beforeEach(() => {
    vi.clearAllMocks();
    (window as unknown as Record<string, unknown>).ethereum = {
      on: vi.fn(),
      removeListener: vi.fn(),
    };
  });

  afterEach(() => {
    delete (window as unknown as Record<string, unknown>).ethereum;
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
});
