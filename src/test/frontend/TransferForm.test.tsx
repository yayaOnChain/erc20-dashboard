import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TransferForm } from '@/frontend/components/TransferForm';

describe('TransferForm', () => {
  const mockOnTransfer = vi.fn();
  const mockProps = {
    onTransfer: mockOnTransfer,
    tokenSymbol: 'MTK',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render form with correct labels', () => {
    render(<TransferForm {...mockProps} />);
    
    expect(screen.getByLabelText(/recipient address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /transfer/i })).toBeInTheDocument();
  });

  it('should display token symbol in header', () => {
    render(<TransferForm {...mockProps} />);
    
    expect(screen.getByText('Send MTK to another address')).toBeInTheDocument();
  });

  it('should display default token symbol when null', () => {
    render(
      <TransferForm
        onTransfer={mockOnTransfer}
        tokenSymbol={null}
      />
    );
    
    expect(screen.getByText('Send MTK to another address')).toBeInTheDocument();
  });

  it('should update input values when typing', async () => {
    const user = userEvent.setup();
    render(<TransferForm {...mockProps} />);
    
    const toInput = screen.getByLabelText(/recipient address/i);
    const amountInput = screen.getByLabelText(/amount/i);
    
    await user.type(toInput, '0x1234567890');
    await user.type(amountInput, '100');
    
    expect(toInput).toHaveValue('0x1234567890');
    expect(amountInput).toHaveValue('100');
  });

  it('should call onTransfer with correct values on submit', async () => {
    const user = userEvent.setup();
    mockOnTransfer.mockResolvedValue({ success: true, hash: '0xabc123' });
    
    render(<TransferForm {...mockProps} />);
    
    const toInput = screen.getByLabelText(/recipient address/i);
    const amountInput = screen.getByLabelText(/amount/i);
    const submitButton = screen.getByRole('button', { name: /transfer/i });
    
    await user.type(toInput, '0x1234567890abcdef1234567890abcdef12345678');
    await user.type(amountInput, '100');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(mockOnTransfer).toHaveBeenCalledWith('0x1234567890abcdef1234567890abcdef12345678', '100');
    });
  });

  it('should show submitting state when transferring', async () => {
    const user = userEvent.setup();
    let resolvePromise: (value: { success: boolean }) => void;
    const pendingPromise = new Promise<{ success: boolean }>((resolve) => {
      resolvePromise = resolve;
    });
    mockOnTransfer.mockImplementation(() => pendingPromise);
    
    render(<TransferForm {...mockProps} />);
    
    const toInput = screen.getByLabelText(/recipient address/i);
    const amountInput = screen.getByLabelText(/amount/i);
    const submitButton = screen.getByRole('button', { name: /transfer/i });
    
    await user.type(toInput, '0x1234567890abcdef1234567890abcdef12345678');
    await user.type(amountInput, '100');
    await user.click(submitButton);
    
    // Wait for button to change state
    await waitFor(() => {
      expect(submitButton).toHaveTextContent('Transferring...');
    });
    
    expect(submitButton).toBeDisabled();
    
    // Resolve the promise to clean up
    resolvePromise!({ success: true });
  });

  it('should show success message after successful transfer', async () => {
    const user = userEvent.setup();
    mockOnTransfer.mockResolvedValue({
      success: true,
      hash: '0xabc123def456',
    });
    
    render(<TransferForm {...mockProps} />);
    
    const toInput = screen.getByLabelText(/recipient address/i);
    const amountInput = screen.getByLabelText(/amount/i);
    const submitButton = screen.getByRole('button', { name: /transfer/i });
    
    await user.type(toInput, '0x1234567890abcdef1234567890abcdef12345678');
    await user.type(amountInput, '100');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Transfer successful!')).toBeInTheDocument();
    });
  });

  it('should show error message after failed transfer', async () => {
    const user = userEvent.setup();
    mockOnTransfer.mockResolvedValue({
      success: false,
      error: 'Insufficient balance',
    });
    
    render(<TransferForm {...mockProps} />);
    
    const toInput = screen.getByLabelText(/recipient address/i);
    const amountInput = screen.getByLabelText(/amount/i);
    const submitButton = screen.getByRole('button', { name: /transfer/i });
    
    await user.type(toInput, '0x1234567890abcdef1234567890abcdef12345678');
    await user.type(amountInput, '100');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Error: Insufficient balance')).toBeInTheDocument();
    });
  });

  it('should clear form after successful transfer', async () => {
    const user = userEvent.setup();
    mockOnTransfer.mockResolvedValue({ success: true, hash: '0xabc123' });
    
    render(<TransferForm {...mockProps} />);
    
    const toInput = screen.getByLabelText(/recipient address/i);
    const amountInput = screen.getByLabelText(/amount/i);
    const submitButton = screen.getByRole('button', { name: /transfer/i });
    
    await user.type(toInput, '0x1234567890abcdef1234567890abcdef12345678');
    await user.type(amountInput, '100');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(toInput).toHaveValue('');
      expect(amountInput).toHaveValue('');
    });
  });

  it('should not clear form after failed transfer', async () => {
    const user = userEvent.setup();
    mockOnTransfer.mockResolvedValue({ success: false, error: 'Failed' });
    
    render(<TransferForm {...mockProps} />);
    
    const toInput = screen.getByLabelText(/recipient address/i);
    const amountInput = screen.getByLabelText(/amount/i);
    const submitButton = screen.getByRole('button', { name: /transfer/i });
    
    await user.type(toInput, '0x1234567890abcdef1234567890abcdef12345678');
    await user.type(amountInput, '100');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(toInput).toHaveValue('0x1234567890abcdef1234567890abcdef12345678');
      expect(amountInput).toHaveValue('100');
    });
  });

  it('should show view on explorer link for successful transfer', async () => {
    const user = userEvent.setup();
    mockOnTransfer.mockResolvedValue({
      success: true,
      hash: '0xabc123def456',
    });
    
    render(<TransferForm {...mockProps} />);
    
    const toInput = screen.getByLabelText(/recipient address/i);
    const amountInput = screen.getByLabelText(/amount/i);
    const submitButton = screen.getByRole('button', { name: /transfer/i });
    
    await user.type(toInput, '0x1234567890abcdef1234567890abcdef12345678');
    await user.type(amountInput, '100');
    await user.click(submitButton);
    
    await waitFor(() => {
      const explorerLink = screen.getByText('View on Explorer');
      expect(explorerLink).toHaveAttribute(
        'href',
        'https://sepolia.etherscan.io/tx/0xabc123def456'
      );
    });
  });

  it('should have required validation on inputs', () => {
    render(<TransferForm {...mockProps} />);
    
    const toInput = screen.getByLabelText(/recipient address/i);
    const amountInput = screen.getByLabelText(/amount/i);
    
    expect(toInput).toHaveAttribute('required');
    expect(amountInput).toHaveAttribute('required');
  });

  it('should have placeholder text for inputs', () => {
    render(<TransferForm {...mockProps} />);
    
    const toInput = screen.getByLabelText(/recipient address/i);
    const amountInput = screen.getByLabelText(/amount/i);
    
    expect(toInput).toHaveAttribute('placeholder', '0x...');
    expect(amountInput).toHaveAttribute('placeholder', '0.00');
  });
});
