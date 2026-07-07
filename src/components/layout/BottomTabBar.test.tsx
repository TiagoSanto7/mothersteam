import { render, screen, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { BottomTabBar } from './BottomTabBar';
import { useAppStore } from '../../store/useAppStore';

beforeEach(() => {
  useAppStore.setState({ activeTab: 'home', phase: { stage: 'pregnant', week: 28 } });
});

describe('BottomTabBar', () => {
  it('renders 5 navigation items including Rotina', () => {
    render(<BottomTabBar />);
    expect(screen.getByTestId('tab-home')).toBeInTheDocument();
    expect(screen.getByTestId('tab-maeIA')).toBeInTheDocument();
    expect(screen.getByTestId('baby-central-button')).toBeInTheDocument();
    expect(screen.getByTestId('tab-rotina')).toBeInTheDocument();
    expect(screen.getByTestId('tab-shopping')).toBeInTheDocument();
  });

  it('does not render Comunidade tab', () => {
    render(<BottomTabBar />);
    expect(screen.queryByTestId('tab-comunidade')).not.toBeInTheDocument();
  });

  it('activates Rotina tab when clicked', () => {
    render(<BottomTabBar />);
    fireEvent.click(screen.getByTestId('tab-rotina'));
    expect(useAppStore.getState().activeTab).toBe('rotina');
  });

  it('activates baby tab via central button', () => {
    render(<BottomTabBar />);
    fireEvent.click(screen.getByTestId('baby-central-button'));
    expect(useAppStore.getState().activeTab).toBe('baby');
  });

  it('shows 🤰 emoji for week 28', () => {
    render(<BottomTabBar />);
    expect(screen.getByTestId('baby-central-button')).toHaveTextContent('🤰');
  });

  it('shows 🌱 emoji for week 4', () => {
    useAppStore.setState({ phase: { stage: 'pregnant', week: 4 } });
    render(<BottomTabBar />);
    expect(screen.getByTestId('baby-central-button')).toHaveTextContent('🌱');
  });
});
