import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MobileShell } from './MobileShell';
import { useAppStore } from '../../store/useAppStore';

const { mockApiFetch } = vi.hoisted(() => ({ mockApiFetch: vi.fn() }));
vi.mock('../../lib/api', () => ({ apiFetch: mockApiFetch, ApiError: class extends Error {} }));

function makeWrapper() {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity } },
    });
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

function renderShell() {
  return render(
    <MobileShell
      drawerOpen={false}
      onOpenDrawer={() => {}}
      onCloseDrawer={() => {}}
      onOpenSettings={() => {}}
      onOpenSavedVerses={() => {}}
    >
      <div>Test content</div>
    </MobileShell>,
    { wrapper: makeWrapper() },
  );
}

beforeEach(() => {
  useAppStore.setState({
    isLoggedIn: true,
    currentUserId: 'u1',
    motherName: 'Mãe',
    keyboardOpen: false,
  });
  mockApiFetch.mockResolvedValue({ ok: true });
});

describe('MobileShell — keyboard behavior', () => {
  it('esconde a tab bar enquanto o teclado está aberto', () => {
    useAppStore.setState({ keyboardOpen: true });
    renderShell();
    expect(screen.queryByTestId('bottom-tab-bar')).not.toBeInTheDocument();
  });

  it('mostra a tab bar quando o teclado está fechado', () => {
    useAppStore.setState({ keyboardOpen: false });
    renderShell();
    expect(screen.getByTestId('bottom-tab-bar')).toBeInTheDocument();
  });
});
