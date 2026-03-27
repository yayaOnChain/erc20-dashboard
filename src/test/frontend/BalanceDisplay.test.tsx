import '@testing-library/jest-dom';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BalanceDisplay } from '@/frontend/components/BalanceDisplay';

describe('BalanceDisplay', () => {
  const mockProps = {
    ethBalance: '1.5',
    tokenBalance: '1000',
    tokenSymbol: 'MTK',
    tokenName: 'MyToken',
    isLoading: false,
  };

  it('should render ETH balance correctly', () => {
    render(<BalanceDisplay {...mockProps} />);
    
    expect(screen.getByText('ETH Balance')).toBeInTheDocument();
    expect(screen.getByText('Native Token')).toBeInTheDocument();
    expect(screen.getByText('1.5000 ETH')).toBeInTheDocument();
  });

  it('should render token balance correctly', () => {
    render(<BalanceDisplay {...mockProps} />);
    
    expect(screen.getByText('MyToken Balance')).toBeInTheDocument();
    expect(screen.getByText('MTK')).toBeInTheDocument();
    expect(screen.getByText('1000.00 MTK')).toBeInTheDocument();
  });

  it('should show loading state when isLoading is true', () => {
    render(<BalanceDisplay {...mockProps} isLoading={true} />);
    
    const loadingElements = screen.getAllByText('Loading...');
    expect(loadingElements).toHaveLength(2);
  });

  it('should handle null balances gracefully', () => {
    render(
      <BalanceDisplay
        ethBalance={null}
        tokenBalance={null}
        tokenSymbol={null}
        tokenName={null}
        isLoading={false}
      />
    );
    
    expect(screen.getByText('0.0000 ETH')).toBeInTheDocument();
    expect(screen.getByText('0.00 MTK')).toBeInTheDocument();
  });

  it('should use default token symbol when null', () => {
    render(
      <BalanceDisplay
        ethBalance="1.5"
        tokenBalance="1000"
        tokenSymbol={null}
        tokenName={null}
        isLoading={false}
      />
    );
    
    expect(screen.getByText('Token Balance')).toBeInTheDocument();
    expect(screen.getByText('MTK')).toBeInTheDocument();
    expect(screen.getByText('1000.00 MTK')).toBeInTheDocument();
  });

  it('should format ETH balance with 4 decimal places', () => {
    render(
      <BalanceDisplay
        {...mockProps}
        ethBalance="2.123456789"
        isLoading={false}
      />
    );
    
    expect(screen.getByText('2.1235 ETH')).toBeInTheDocument();
  });

  it('should format token balance with 2 decimal places', () => {
    render(
      <BalanceDisplay
        {...mockProps}
        tokenBalance="500.5678"
        isLoading={false}
      />
    );
    
    expect(screen.getByText('500.57 MTK')).toBeInTheDocument();
  });

  it('should display custom token name and symbol', () => {
    render(
      <BalanceDisplay
        {...mockProps}
        tokenName="Custom Token"
        tokenSymbol="CTK"
      />
    );
    
    expect(screen.getByText('Custom Token Balance')).toBeInTheDocument();
    expect(screen.getByText('CTK')).toBeInTheDocument();
    expect(screen.getByText('1000.00 CTK')).toBeInTheDocument();
  });

  it('should have proper card styling for ETH balance', () => {
    const { container } = render(<BalanceDisplay {...mockProps} />);
    
    const ethCard = container.querySelector('.bg-linear-to-br.from-blue-50');
    expect(ethCard).toBeInTheDocument();
  });

  it('should have proper card styling for token balance', () => {
    const { container } = render(<BalanceDisplay {...mockProps} />);
    
    const tokenCard = container.querySelector('.bg-linear-to-br.from-purple-50');
    expect(tokenCard).toBeInTheDocument();
  });
});
