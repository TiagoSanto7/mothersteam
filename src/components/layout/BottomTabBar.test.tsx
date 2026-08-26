import { render, screen, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { BottomTabBar } from './BottomTabBar';
import { useAppStore } from '../../store/useAppStore';

beforeEach(() => {
  useAppStore.setState({ activeTab: 'hoje', phase: { stage: 'pregnant', week: 28 } });
});

describe('BottomTabBar', () => {
  it('renders exactly 4 navigation tabs', () => {
    render(<BottomTabBar />);
    expect(screen.getByTestId('tab-hoje')).toBeInTheDocument();
    expect(screen.getByTestId('tab-jornada')).toBeInTheDocument();
    expect(screen.getByTestId('tab-comunidade')).toBeInTheDocument();
    expect(screen.getByTestId('tab-perfil')).toBeInTheDocument();
  });

  it('does not render old tabs', () => {
    render(<BottomTabBar />);
    expect(screen.queryByTestId('tab-home')).not.toBeInTheDocument();
    expect(screen.queryByTestId('tab-maeIA')).not.toBeInTheDocument();
    expect(screen.queryByTestId('tab-baby')).not.toBeInTheDocument();
    expect(screen.queryByTestId('tab-rotina')).not.toBeInTheDocument();
    expect(screen.queryByTestId('baby-central-button')).not.toBeInTheDocument();
  });

  it('renders the central M-CTA button between jornada and comunidade', () => {
    render(<BottomTabBar />);
    expect(screen.getByTestId('bottom-cta')).toBeInTheDocument();
  });

  it('M-CTA click opens quickActions overlay in store', () => {
    render(<BottomTabBar />);
    expect(useAppStore.getState().quickActionsOpen).toBe(false);
    fireEvent.click(screen.getByTestId('bottom-cta'));
    expect(useAppStore.getState().quickActionsOpen).toBe(true);
  });

  it('activates hoje tab when clicked', () => {
    useAppStore.setState({ activeTab: 'comunidade' });
    render(<BottomTabBar />);
    fireEvent.click(screen.getByTestId('tab-hoje'));
    expect(useAppStore.getState().activeTab).toBe('hoje');
  });

  it('activates jornada tab when clicked', () => {
    render(<BottomTabBar />);
    fireEvent.click(screen.getByTestId('tab-jornada'));
    expect(useAppStore.getState().activeTab).toBe('jornada');
  });

  it('activates comunidade tab when clicked', () => {
    render(<BottomTabBar />);
    fireEvent.click(screen.getByTestId('tab-comunidade'));
    expect(useAppStore.getState().activeTab).toBe('comunidade');
  });

  it('activates perfil tab when clicked', () => {
    render(<BottomTabBar />);
    fireEvent.click(screen.getByTestId('tab-perfil'));
    expect(useAppStore.getState().activeTab).toBe('perfil');
  });

  it('marks hoje tab as active via aria-pressed', () => {
    render(<BottomTabBar />);
    expect(screen.getByTestId('tab-hoje')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('tab-comunidade')).toHaveAttribute('aria-pressed', 'false');
  });
});
