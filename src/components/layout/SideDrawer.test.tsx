import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SideDrawer } from './SideDrawer';
import { useAppStore } from '../../store/useAppStore';

vi.mock('../../lib/api', () => ({ apiFetch: vi.fn().mockResolvedValue({ ok: true }) }));

vi.mock('framer-motion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('framer-motion')>();
  return {
    ...actual,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    motion: {
      ...actual.motion,
      div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) => (
        <div {...props}>{children}</div>
      ),
    },
  };
});

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  useAppStore.setState({ motherName: 'Mariana', currentUserId: 'u1' });
});

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  onOpenProfile: vi.fn(),
  onOpenSettings: vi.fn(),
  onOpenSavedVerses: vi.fn(),
};

describe('SideDrawer', () => {
  it('renders the drawer panel when isOpen is true', () => {
    render(<SideDrawer {...defaultProps} />, { wrapper });
    expect(screen.getByTestId('side-drawer')).toBeInTheDocument();
  });

  it('does not render the drawer panel when isOpen is false', () => {
    render(<SideDrawer {...defaultProps} isOpen={false} />, { wrapper });
    expect(screen.queryByTestId('side-drawer')).not.toBeInTheDocument();
  });

  it('renders the user name', () => {
    render(<SideDrawer {...defaultProps} />, { wrapper });
    expect(screen.getByText('Mariana')).toBeInTheDocument();
  });

  it('renders Perfil navigation item', () => {
    render(<SideDrawer {...defaultProps} />, { wrapper });
    expect(screen.getByRole('button', { name: /perfil/i })).toBeInTheDocument();
  });

  it('renders Configurações navigation item', () => {
    render(<SideDrawer {...defaultProps} />, { wrapper });
    expect(screen.getByRole('button', { name: /configurações/i })).toBeInTheDocument();
  });

  it('renders Sair da conta button', () => {
    render(<SideDrawer {...defaultProps} />, { wrapper });
    expect(screen.getByRole('button', { name: /sair da conta/i })).toBeInTheDocument();
  });

  it('calls onClose when overlay is clicked', () => {
    const onClose = vi.fn();
    render(<SideDrawer {...defaultProps} onClose={onClose} />, { wrapper });
    fireEvent.click(screen.getByTestId('drawer-overlay'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when Fechar menu button is clicked', () => {
    const onClose = vi.fn();
    render(<SideDrawer {...defaultProps} onClose={onClose} />, { wrapper });
    fireEvent.click(screen.getByRole('button', { name: /fechar menu/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose and onOpenProfile when Perfil is clicked', () => {
    const onClose = vi.fn();
    const onOpenProfile = vi.fn();
    render(<SideDrawer {...defaultProps} onClose={onClose} onOpenProfile={onOpenProfile} />, { wrapper });
    fireEvent.click(screen.getByRole('button', { name: /perfil/i }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(onOpenProfile).toHaveBeenCalledOnce();
  });

  it('calls onClose and onOpenSettings when Configurações is clicked', () => {
    const onClose = vi.fn();
    const onOpenSettings = vi.fn();
    render(<SideDrawer {...defaultProps} onClose={onClose} onOpenSettings={onOpenSettings} />, { wrapper });
    fireEvent.click(screen.getByRole('button', { name: /configurações/i }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(onOpenSettings).toHaveBeenCalledOnce();
  });

  it('calls onClose when Sair da conta is clicked', () => {
    const onClose = vi.fn();
    render(<SideDrawer {...defaultProps} onClose={onClose} />, { wrapper });
    fireEvent.click(screen.getByRole('button', { name: /sair da conta/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});

describe('SideDrawer — meus versículos', () => {
  it('renders the "Meus versículos" button', () => {
    render(<SideDrawer {...defaultProps} />, { wrapper });
    expect(screen.getByRole('button', { name: /meus versículos/i })).toBeTruthy();
  });

  it('calls onOpenSavedVerses and closes when button is tapped', () => {
    const onClose = vi.fn();
    const onOpenSavedVerses = vi.fn();
    render(
      <SideDrawer {...defaultProps} onClose={onClose} onOpenSavedVerses={onOpenSavedVerses} />,
      { wrapper }
    );
    fireEvent.click(screen.getByRole('button', { name: /meus versículos/i }));
    expect(onOpenSavedVerses).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
