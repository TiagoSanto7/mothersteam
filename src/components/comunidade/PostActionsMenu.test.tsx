import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PostActionsMenu } from './PostActionsMenu';

const mockApiFetch = vi.hoisted(() => vi.fn());
vi.mock('../../lib/api', () => ({ apiFetch: mockApiFetch, ApiError: class extends Error {} }));

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  mockApiFetch.mockReset();
  mockApiFetch.mockResolvedValue(undefined);
});

describe('PostActionsMenu — trigger', () => {
  it('renders the ⋯ trigger button', () => {
    render(<PostActionsMenu postId="p1" isOwner={false} />, { wrapper });
    expect(screen.getByRole('button', { name: 'Mais opções' })).toBeInTheDocument();
  });

  it('clicking the trigger opens the menu', () => {
    render(<PostActionsMenu postId="p1" isOwner={false} />, { wrapper });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Mais opções' }));
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('pressing Escape closes the menu', () => {
    render(<PostActionsMenu postId="p1" isOwner={false} />, { wrapper });
    fireEvent.click(screen.getByRole('button', { name: 'Mais opções' }));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('clicking the backdrop closes the menu', () => {
    render(<PostActionsMenu postId="p1" isOwner={false} />, { wrapper });
    fireEvent.click(screen.getByRole('button', { name: 'Mais opções' }));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    // The backdrop is the aria-hidden fixed div rendered when open
    const backdrop = document.querySelector('[aria-hidden="true"]') as HTMLElement;
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});

describe('PostActionsMenu — owner path', () => {
  // Real timers — owner tests use waitFor with promise resolution

  it('shows "Apagar publicação" when isOwner=true', () => {
    render(<PostActionsMenu postId="p1" isOwner={true} />, { wrapper });
    fireEvent.click(screen.getByRole('button', { name: 'Mais opções' }));
    expect(screen.getByRole('menuitem', { name: 'Apagar publicação' })).toBeInTheDocument();
  });

  it('does NOT show "Reportar" when isOwner=true', () => {
    render(<PostActionsMenu postId="p1" isOwner={true} />, { wrapper });
    fireEvent.click(screen.getByRole('button', { name: 'Mais opções' }));
    expect(screen.queryByRole('menuitem', { name: /reportar/i })).not.toBeInTheDocument();
  });

  it('calls apiFetch with DELETE /posts/:id when Apagar is clicked', async () => {
    render(<PostActionsMenu postId="p1" isOwner={true} />, { wrapper });
    fireEvent.click(screen.getByRole('button', { name: 'Mais opções' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Apagar publicação' }));
    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith('/posts/p1', { method: 'DELETE' });
    });
  });

  it('calls onDeleted callback after successful delete', async () => {
    const onDeleted = vi.fn();
    render(<PostActionsMenu postId="p1" isOwner={true} onDeleted={onDeleted} />, { wrapper });
    fireEvent.click(screen.getByRole('button', { name: 'Mais opções' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Apagar publicação' }));
    await waitFor(() => {
      expect(onDeleted).toHaveBeenCalledOnce();
    });
  });
});

describe('PostActionsMenu — non-owner path', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows "Reportar publicação" when isOwner=false', () => {
    render(<PostActionsMenu postId="p1" isOwner={false} />, { wrapper });
    fireEvent.click(screen.getByRole('button', { name: 'Mais opções' }));
    expect(screen.getByRole('menuitem', { name: 'Reportar publicação' })).toBeInTheDocument();
  });

  it('does NOT show "Apagar" when isOwner=false', () => {
    render(<PostActionsMenu postId="p1" isOwner={false} />, { wrapper });
    fireEvent.click(screen.getByRole('button', { name: 'Mais opções' }));
    expect(screen.queryByRole('menuitem', { name: /apagar/i })).not.toBeInTheDocument();
  });

  it('shows "Obrigada" confirmation text after clicking Reportar', () => {
    render(<PostActionsMenu postId="p1" isOwner={false} />, { wrapper });
    fireEvent.click(screen.getByRole('button', { name: 'Mais opções' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Reportar publicação' }));
    expect(screen.getByText(/obrigada/i)).toBeInTheDocument();
  });

  it('closes the menu after 2000ms following Reportar', () => {
    render(<PostActionsMenu postId="p1" isOwner={false} />, { wrapper });
    fireEvent.click(screen.getByRole('button', { name: 'Mais opções' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Reportar publicação' }));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(2000); });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('does NOT call apiFetch when Reportar is clicked', () => {
    render(<PostActionsMenu postId="p1" isOwner={false} />, { wrapper });
    fireEvent.click(screen.getByRole('button', { name: 'Mais opções' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Reportar publicação' }));
    expect(mockApiFetch).not.toHaveBeenCalled();
  });
});
