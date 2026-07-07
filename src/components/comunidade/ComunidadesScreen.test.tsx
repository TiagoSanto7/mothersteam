import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, beforeEach } from 'vitest';
import { ComunidadesScreen } from './ComunidadesScreen';
import { useAppStore } from '../../store/useAppStore';

beforeEach(() => {
  useAppStore.setState({
    communities: [
      {
        id: 'amamentacao-apoio',
        name: 'Amamentação com Apoio',
        description: 'Dúvidas da amamentação.',
        category: 'amamentação',
        memberCount: 3210,
        colorKey: 'warm',
      },
      {
        id: 'pos-parto-real',
        name: 'Pós-parto Real',
        description: 'O quarto trimestre sem filtros.',
        category: 'pós-parto',
        memberCount: 2670,
        colorKey: 'linen',
      },
      {
        id: 'saude-mental',
        name: 'Saúde Mental na Maternidade',
        description: 'Espaço seguro.',
        category: 'saúde mental',
        memberCount: 4120,
        colorKey: 'cream',
      },
    ],
    followedCommunityIds: ['amamentacao-apoio'],
    phase: { stage: 'postpartum', ageInDays: 30 },
    motherProfile: null,
  });
});

describe('ComunidadesScreen', () => {
  it('renders Seguindo and Sugestões sub-filter buttons', () => {
    render(<ComunidadesScreen />);
    expect(screen.getByRole('button', { name: /seguindo/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sugestões/i })).toBeInTheDocument();
  });

  it('shows only followed communities in Seguindo tab', () => {
    render(<ComunidadesScreen />);
    fireEvent.click(screen.getByRole('button', { name: /seguindo/i }));
    expect(screen.getByText('Amamentação com Apoio')).toBeInTheDocument();
    expect(screen.queryByText('Pós-parto Real')).not.toBeInTheDocument();
  });

  it('shows only non-followed communities in Sugestões tab', () => {
    render(<ComunidadesScreen />);
    fireEvent.click(screen.getByRole('button', { name: /sugestões/i }));
    expect(screen.queryByText('Amamentação com Apoio')).not.toBeInTheDocument();
    expect(screen.getByText('Pós-parto Real')).toBeInTheDocument();
    expect(screen.getByText('Saúde Mental na Maternidade')).toBeInTheDocument();
  });

  it('defaults to Seguindo sub-filter', () => {
    render(<ComunidadesScreen />);
    const seguindoButton = screen.getByRole('button', { name: /seguindo/i });
    expect(seguindoButton).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows empty state message when following no communities', () => {
    useAppStore.setState({ followedCommunityIds: [] });
    render(<ComunidadesScreen />);
    expect(screen.getByText(/você ainda não segue/i)).toBeInTheDocument();
  });
});
