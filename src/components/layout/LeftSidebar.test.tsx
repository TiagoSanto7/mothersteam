import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { LeftSidebar } from './LeftSidebar';
import { useAppStore } from '../../store/useAppStore';

const { mockApiFetch } = vi.hoisted(() => ({ mockApiFetch: vi.fn() }));
vi.mock('../../lib/api', () => ({ apiFetch: mockApiFetch, ApiError: class extends Error {} }));

beforeEach(() => {
  mockApiFetch.mockResolvedValue(undefined);
  useAppStore.setState({
    isLoggedIn: true,
    currentUserId: 'me-1',
    motherName: 'Mariana',
    activeTab: 'hoje',
  });
});

function Wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

function renderSidebar() {
  return render(
    <LeftSidebar
      unreadNotifs={0}
      unreadChats={0}
      onOpenNotifications={vi.fn()}
      onOpenChat={vi.fn()}
      onOpenSettings={vi.fn()}
    />,
    { wrapper: Wrapper },
  );
}

describe('LeftSidebar navigation', () => {
  it('has Hoje in the primary nav', () => {
    renderSidebar();
    fireEvent.click(screen.getByRole('button', { name: 'Hoje' }));
    expect(useAppStore.getState().activeTab).toBe('hoje');
  });

  it('has Jornada in the primary nav', () => {
    renderSidebar();
    fireEvent.click(screen.getByRole('button', { name: 'Jornada' }));
    expect(useAppStore.getState().activeTab).toBe('jornada');
  });

  it('has Comunidade in the primary nav', () => {
    renderSidebar();
    fireEvent.click(screen.getByRole('button', { name: 'Comunidade' }));
    expect(useAppStore.getState().activeTab).toBe('comunidade');
  });

  it('has Perfil in the primary nav (sets tab, not overlay)', () => {
    renderSidebar();
    fireEvent.click(screen.getByRole('button', { name: 'Perfil' }));
    expect(useAppStore.getState().activeTab).toBe('perfil');
  });

  it('does not have Shopping button', () => {
    renderSidebar();
    expect(screen.queryByRole('button', { name: 'Shopping' })).not.toBeInTheDocument();
  });
});

describe('LeftSidebar logout', () => {
  it('calls /auth/logout and clears auth when Sair is clicked', () => {
    renderSidebar();
    fireEvent.click(screen.getByRole('button', { name: 'Sair' }));
    expect(mockApiFetch).toHaveBeenCalledWith(
      '/auth/logout',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(useAppStore.getState().isLoggedIn).toBe(false);
  });
});
