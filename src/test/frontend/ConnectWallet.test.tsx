import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConnectWallet } from '@/frontend/components/ConnectWallet';

describe('ConnectWallet', () => {
  const mockProps = {
    address: '0x1234567890abcdef1234567890abcdef12345678',
    isConnected: false,
    onConnect: vi.fn(),
    onDisconnect: vi.fn(),
  };

  it('should render connect button when not connected', () => {
    render(<ConnectWallet {...mockProps} />);
    
    const connectButton = screen.getByRole('button', { name: /connect wallet/i });
    expect(connectButton).toBeInTheDocument();
    expect(connectButton).toHaveClass('bg-blue-600');
  });

  it('should call onConnect when connect button is clicked', () => {
    render(<ConnectWallet {...mockProps} />);
    
    const connectButton = screen.getByRole('button', { name: /connect wallet/i });
    fireEvent.click(connectButton);
    
    expect(mockProps.onConnect).toHaveBeenCalledTimes(1);
  });

  it('should render wallet address and disconnect button when connected', () => {
    render(
      <ConnectWallet
        address={mockProps.address}
        isConnected={true}
        onConnect={mockProps.onConnect}
        onDisconnect={mockProps.onDisconnect}
      />
    );
    
    const addressText = screen.getByText(/0x1234...5678/i);
    expect(addressText).toBeInTheDocument();
    
    const disconnectButton = screen.getByRole('button', { name: /disconnect/i });
    expect(disconnectButton).toBeInTheDocument();
    expect(disconnectButton).toHaveClass('bg-red-500');
  });

  it('should call onDisconnect when disconnect button is clicked', () => {
    render(
      <ConnectWallet
        address={mockProps.address}
        isConnected={true}
        onConnect={mockProps.onConnect}
        onDisconnect={mockProps.onDisconnect}
      />
    );
    
    const disconnectButton = screen.getByRole('button', { name: /disconnect/i });
    fireEvent.click(disconnectButton);
    
    expect(mockProps.onDisconnect).toHaveBeenCalledTimes(1);
  });

  it('should format address correctly', () => {
    const testAddress = '0xabcdef1234567890abcdef1234567890abcdef12';
    render(
      <ConnectWallet
        address={testAddress}
        isConnected={true}
        onConnect={mockProps.onConnect}
        onDisconnect={mockProps.onDisconnect}
      />
    );
    
    expect(screen.getByText(/0xabcd...ef12/i)).toBeInTheDocument();
  });

  it('should show connected status indicator when connected', () => {
    render(
      <ConnectWallet
        address={mockProps.address}
        isConnected={true}
        onConnect={mockProps.onConnect}
        onDisconnect={mockProps.onDisconnect}
      />
    );
    
    const statusIndicator = screen.getByTestId('status-indicator');
    expect(statusIndicator).toHaveClass('bg-green-500');
    expect(statusIndicator).toHaveClass('animate-pulse');
  });
});
