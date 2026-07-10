import { render, screen } from '@testing-library/react';
import { describe, expect, it, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { useAppStore } from './store/useAppStore';

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  useAppStore.setState({
    isLoggedIn: true,
    onboardingDone: true,
    activeTab: 'home',
    motherName: 'Mariana',
    phase: { stage: 'pregnant', week: 28 },
    followedCommunityIds: [],
    motherProfile: null,
  });
});

describe('App routing', () => {
  it('home tab renders ComunidadeScreen (Para Você tab visible)', () => {
    useAppStore.setState({ activeTab: 'home' });
    render(<App />, { wrapper });
    expect(screen.getByRole('button', { name: /para você/i })).toBeInTheDocument();
  });

  it('rotina tab renders HomeScreen (Para Você tab absent)', () => {
    useAppStore.setState({ activeTab: 'rotina' });
    render(<App />, { wrapper });
    expect(screen.queryByRole('button', { name: /para você/i })).not.toBeInTheDocument();
  });

  it('comunidade tab renders ComunidadeScreen (alias for stale state)', () => {
    useAppStore.setState({ activeTab: 'comunidade' });
    render(<App />, { wrapper });
    expect(screen.getByRole('button', { name: /para você/i })).toBeInTheDocument();
  });
});
