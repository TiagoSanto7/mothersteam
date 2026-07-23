import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LeftSidebar } from './LeftSidebar';
import { useAppStore } from '../../store/useAppStore';

beforeEach(() => {
  useAppStore.setState({
    isLoggedIn: true,
    currentUserId: 'me-1',
    motherName: 'Mariana',
    activeTab: 'home',
  });
});

function renderSidebar() {
  return render(
    <LeftSidebar
      unreadNotifs={0}
      unreadChats={0}
      onOpenNotifications={vi.fn()}
      onOpenChat={vi.fn()}
      onOpenProfile={vi.fn()}
      onOpenSettings={vi.fn()}
    />,
  );
}

describe('LeftSidebar navigation parity', () => {
  it('has Comunidade in the primary nav', () => {
    renderSidebar();
    const comunidade = screen.getByRole('button', { name: 'Comunidade' });
    fireEvent.click(comunidade);
    expect(useAppStore.getState().activeTab).toBe('comunidade');
  });

  it('has Shopping accessible from the sidebar (secondary section, not primary)', () => {
    renderSidebar();
    const shopping = screen.getByRole('button', { name: 'Shopping' });
    fireEvent.click(shopping);
    expect(useAppStore.getState().activeTab).toBe('shopping');
  });
});
