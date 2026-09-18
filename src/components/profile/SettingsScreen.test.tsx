import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SettingsScreen } from './SettingsScreen';
import { useAppStore } from '../../store/useAppStore';

const { mockApiFetch } = vi.hoisted(() => ({ mockApiFetch: vi.fn() }));
vi.mock('../../lib/api', () => ({
  apiFetch: mockApiFetch,
  resolveStaticUrl: (path: string) => path,
  ApiError: class extends Error {},
}));

function renderScreen() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <SettingsScreen onBack={vi.fn()} onClose={vi.fn()} />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  useAppStore.setState({ motherName: 'Mariana', email: 'mariana@test.com' });
  mockApiFetch.mockResolvedValue({});
});

describe('SettingsScreen toggles', () => {
  it('toggle thumb has explicit left-0.5 positioning (prevents overflow)', () => {
    renderScreen();
    const curtidas = screen.getByLabelText('Curtidas e comentários');
    const thumb = curtidas.querySelector('span');
    expect(thumb?.className).toMatch(/left-0\.5/);
  });

  it('toggle button has p-0 to remove browser default padding', () => {
    renderScreen();
    const curtidas = screen.getByLabelText('Curtidas e comentários');
    expect(curtidas.className).toMatch(/p-0/);
  });

  it('clicking Curtidas toggle changes background color', () => {
    renderScreen();
    const btn = screen.getByLabelText('Curtidas e comentários');
    expect(btn.className).toMatch(/bg-mt-rose/);
    fireEvent.click(btn);
    expect(btn.className).toMatch(/bg-gray-200/);
  });

  it('clicking Novas publicações toggle changes background color', () => {
    renderScreen();
    const btn = screen.getByLabelText('Novas publicações');
    expect(btn.className).toMatch(/bg-gray-200/);
    fireEvent.click(btn);
    expect(btn.className).toMatch(/bg-mt-rose/);
  });
});

describe('SettingsScreen — seção Legal (TIA-49)', () => {
  it('shows Termos de Uso and Política de Privacidade as external links', () => {
    renderScreen();
    const termos = screen.getByRole('link', { name: /termos de uso/i });
    const privacidade = screen.getByRole('link', { name: /política de privacidade/i });
    for (const link of [termos, privacidade]) {
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
    }
    expect(termos.getAttribute('href')).toBe('/termos.html');
    expect(privacidade.getAttribute('href')).toBe('/privacidade.html');
  });
});
