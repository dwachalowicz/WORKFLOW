/* eslint-disable @typescript-eslint/no-explicit-any */
 
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DeleteAccountModal } from '@/components/modals/DeleteAccountModal';
import { useAuthStore } from '@/store/authStore';

// Mock authStore actions
const mockDeleteAccount = vi.fn();
const mockGetAccountDeletionInfo = vi.fn().mockResolvedValue({
  processCount: 5,
  workspaceCount: 2,
  membershipCount: 3,
  versionCount: 10,
  commentCount: 8,
});

beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.setState({
    user: { id: 'u1', email: 'test@flow.gryf.ai', name: 'Test', tier: 'PRO' } as any,
    deleteAccount: mockDeleteAccount,
    getAccountDeletionInfo: mockGetAccountDeletionInfo,
  } as any);
});

describe('DeleteAccountModal', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <DeleteAccountModal isOpen={false} onClose={vi.fn()} />
    );
    expect(container.innerHTML).toBe('');
  });

  const renderAndGoToConfirmStep = async (onClose = vi.fn()) => {
    const view = render(<DeleteAccountModal isOpen={true} onClose={onClose} />);
    await waitFor(() => {
      expect(screen.getByText('auth.continueBtn')).not.toBeDisabled();
    });
    fireEvent.click(screen.getByText('auth.continueBtn'));
    return view;
  };

  it('renders info step when open', async () => {
    render(<DeleteAccountModal isOpen={true} onClose={vi.fn()} />);
    
    // Wait for deletion info to load
    await waitFor(() => {
      expect(mockGetAccountDeletionInfo).toHaveBeenCalled();
    });

    // Should show the delete account title (key)
    expect(screen.getByText('auth.deleteAccount')).toBeInTheDocument();
  });

  it('shows data summary after loading', async () => {
    render(<DeleteAccountModal isOpen={true} onClose={vi.fn()} />);

    await waitFor(() => {
      // Translation keys contain the count interpolation
      expect(screen.getByText(/auth\.processCount/)).toBeInTheDocument();
    });
  });

  it('transitions to confirm step on continue click', async () => {
    await renderAndGoToConfirmStep();

    // Should now show the confirmation input
    expect(screen.getByPlaceholderText('auth.confirmPlaceholder')).toBeInTheDocument();
    expect(screen.getByText('auth.confirmWord')).toBeInTheDocument();
  });

  it('delete button is disabled until confirm word is typed', async () => {
    await renderAndGoToConfirmStep();

    const deleteBtn = screen.getByText('auth.deleteForever').closest('button')!;
    expect(deleteBtn).toBeDisabled();

    // Type the confirm word (mock t returns the key itself)
    const input = screen.getByPlaceholderText('auth.confirmPlaceholder');
    fireEvent.change(input, { target: { value: 'auth.confirmWord' } });

    expect(deleteBtn).not.toBeDisabled();
  });

  it('calls deleteAccount when confirmed', async () => {
    mockDeleteAccount.mockResolvedValue(undefined);

    await renderAndGoToConfirmStep();

    const input = screen.getByPlaceholderText('auth.confirmPlaceholder');
    fireEvent.change(input, { target: { value: 'auth.confirmWord' } });
    fireEvent.click(screen.getByText('auth.deleteForever'));

    await waitFor(() => {
      expect(mockDeleteAccount).toHaveBeenCalled();
    });
  });

  it('shows error on deleteAccount failure', async () => {
    mockDeleteAccount.mockRejectedValue(new Error('Server error'));

    await renderAndGoToConfirmStep();

    const input = screen.getByPlaceholderText('auth.confirmPlaceholder');
    fireEvent.change(input, { target: { value: 'auth.confirmWord' } });
    fireEvent.click(screen.getByText('auth.deleteForever'));

    await waitFor(() => {
      expect(screen.getByText('Server error')).toBeInTheDocument();
    });
  });

  it('calls onClose when cancel is clicked', async () => {
    const onClose = vi.fn();
    render(<DeleteAccountModal isOpen={true} onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByText('common.cancel')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('common.cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('go back button returns to info step', async () => {
    await renderAndGoToConfirmStep();

    const goBackBtn = await screen.findByText('auth.goBack');
    expect(goBackBtn).toBeInTheDocument();

    fireEvent.click(goBackBtn);
    expect(await screen.findByText('auth.continueBtn')).toBeInTheDocument();
  });
});
