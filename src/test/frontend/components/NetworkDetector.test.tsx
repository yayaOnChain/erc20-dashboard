import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NetworkDetector } from '@/frontend/components/NetworkDetector';

describe('NetworkDetector', () => {
  const mockOnSwitchNetwork = vi.fn();

  it('should show not connected state when chainId is null', () => {
    render(
      <NetworkDetector
        chainId={null}
        onSwitchNetwork={mockOnSwitchNetwork}
      />
    );
    
    expect(screen.getByText('Network: Not Connected')).toBeInTheDocument();
  });

  it('should show Hardhat Local network name for chainId 31337', () => {
    render(
      <NetworkDetector
        chainId={31337}
        onSwitchNetwork={mockOnSwitchNetwork}
      />
    );
    
    expect(screen.getByText('Network: Hardhat Local')).toBeInTheDocument();
  });

  it('should show Sepolia Testnet for chainId 11155111', () => {
    render(
      <NetworkDetector
        chainId={11155111}
        onSwitchNetwork={mockOnSwitchNetwork}
      />
    );
    
    expect(screen.getByText('Network: Sepolia Testnet')).toBeInTheDocument();
  });

  it('should show Ethereum Mainnet for chainId 1', () => {
    render(
      <NetworkDetector
        chainId={1}
        onSwitchNetwork={mockOnSwitchNetwork}
      />
    );
    
    expect(screen.getByText('Network: Ethereum Mainnet')).toBeInTheDocument();
  });

  it('should show Goerli Testnet for chainId 5', () => {
    render(
      <NetworkDetector
        chainId={5}
        onSwitchNetwork={mockOnSwitchNetwork}
      />
    );
    
    expect(screen.getByText('Network: Goerli Testnet')).toBeInTheDocument();
  });

  it('should show unknown network for unsupported chainId', () => {
    render(
      <NetworkDetector
        chainId={999}
        onSwitchNetwork={mockOnSwitchNetwork}
      />
    );
    
    expect(screen.getByText('Network: Unknown (999)')).toBeInTheDocument();
  });

  it('should show switch to Sepolia button for unsupported network', () => {
    render(
      <NetworkDetector
        chainId={1}
        onSwitchNetwork={mockOnSwitchNetwork}
      />
    );
    
    const switchButton = screen.getByRole('button', { name: /switch to sepolia/i });
    expect(switchButton).toBeInTheDocument();
  });

  it('should not show switch button for supported network (Sepolia)', () => {
    render(
      <NetworkDetector
        chainId={11155111}
        onSwitchNetwork={mockOnSwitchNetwork}
      />
    );
    
    expect(screen.queryByRole('button', { name: /switch to sepolia/i })).not.toBeInTheDocument();
  });

  it('should not show switch button for supported network (Hardhat)', () => {
    render(
      <NetworkDetector
        chainId={31337}
        onSwitchNetwork={mockOnSwitchNetwork}
      />
    );
    
    expect(screen.queryByRole('button', { name: /switch to sepolia/i })).not.toBeInTheDocument();
  });

  it('should call onSwitchNetwork when switch button is clicked', () => {
    render(
      <NetworkDetector
        chainId={1}
        onSwitchNetwork={mockOnSwitchNetwork}
      />
    );
    
    const switchButton = screen.getByRole('button', { name: /switch to sepolia/i });
    fireEvent.click(switchButton);
    
    expect(mockOnSwitchNetwork).toHaveBeenCalledWith(11155111);
    expect(mockOnSwitchNetwork).toHaveBeenCalledTimes(1);
  });

  it('should show green background for supported network', () => {
    const { container } = render(
      <NetworkDetector
        chainId={11155111}
        onSwitchNetwork={mockOnSwitchNetwork}
      />
    );
    
    const networkCard = container.querySelector('.bg-green-100');
    expect(networkCard).toBeInTheDocument();
  });

  it('should show yellow background for unsupported network', () => {
    const { container } = render(
      <NetworkDetector
        chainId={1}
        onSwitchNetwork={mockOnSwitchNetwork}
      />
    );
    
    const networkCard = container.querySelector('.bg-yellow-100');
    expect(networkCard).toBeInTheDocument();
  });

  it('should show gray background when not connected', () => {
    const { container } = render(
      <NetworkDetector
        chainId={null}
        onSwitchNetwork={mockOnSwitchNetwork}
      />
    );
    
    const networkCard = container.querySelector('.bg-gray-100');
    expect(networkCard).toBeInTheDocument();
  });

  it('should show pulse animation for connected network indicator', () => {
    const { container } = render(
      <NetworkDetector
        chainId={11155111}
        onSwitchNetwork={mockOnSwitchNetwork}
      />
    );
    
    const indicator = container.querySelector('.animate-pulse');
    expect(indicator).toBeInTheDocument();
  });

  it('should show warning message for unsupported network', () => {
    render(
      <NetworkDetector
        chainId={1}
        onSwitchNetwork={mockOnSwitchNetwork}
      />
    );
    
    expect(
      screen.getByText('Please switch to Sepolia Testnet for best experience')
    ).toBeInTheDocument();
  });

  it('should not show warning message for supported network', () => {
    render(
      <NetworkDetector
        chainId={11155111}
        onSwitchNetwork={mockOnSwitchNetwork}
      />
    );
    
    expect(
      screen.queryByText('Please switch to Sepolia Testnet for best experience')
    ).not.toBeInTheDocument();
  });
});
