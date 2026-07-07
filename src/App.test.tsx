import { render, screen } from '@testing-library/react';
import { describe, expect, it, beforeEach } from 'vitest';
import App from './App';
import { useAppStore } from './store/useAppStore';

beforeEach(() => {
  useAppStore.setState({
    isLoggedIn: true,
    onboardingDone: true,
    motherName: 'Mariana',
    phase: { stage: 'pregnant', week: 28 },
    communityPosts: [],
    communities: [],
    followedCommunityIds: [],
    motherProfile: null,
    routineEntries: [],
  });
});

describe('App routing', () => {
  it('home tab renders ComunidadeScreen (Para Você tab visible)', () => {
    useAppStore.setState({ activeTab: 'home' });
    render(<App />);
    expect(screen.getByRole('button', { name: /para você/i })).toBeInTheDocument();
  });

  it('rotina tab renders HomeScreen (Para Você tab absent)', () => {
    useAppStore.setState({ activeTab: 'rotina' });
    render(<App />);
    expect(screen.queryByRole('button', { name: /para você/i })).not.toBeInTheDocument();
  });

  it('comunidade tab renders ComunidadeScreen (alias for stale state)', () => {
    useAppStore.setState({ activeTab: 'comunidade' });
    render(<App />);
    expect(screen.getByRole('button', { name: /para você/i })).toBeInTheDocument();
  });
});
