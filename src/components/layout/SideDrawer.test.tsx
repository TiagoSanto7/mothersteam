import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { SideDrawer } from './SideDrawer';
import { useAppStore } from '../../store/useAppStore';

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

beforeEach(() => {
  useAppStore.setState({
    motherName: 'Mariana',
    communityPosts: [
      { id: '1', author: 'Mariana', category: 'gestação', content: 'Post', likes: 0, replies: 0, time: '1h' },
      { id: '2', author: 'Outra', category: 'gestação', content: 'Post2', likes: 0, replies: 0, time: '1h' },
    ],
  });
});

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  onOpenProfile: vi.fn(),
  onOpenSettings: vi.fn(),
};

describe('SideDrawer', () => {
  it('renders the drawer panel when isOpen is true', () => {
    render(<SideDrawer {...defaultProps} />);
    expect(screen.getByTestId('side-drawer')).toBeInTheDocument();
  });

  it('does not render the drawer panel when isOpen is false', () => {
    render(<SideDrawer {...defaultProps} isOpen={false} />);
    expect(screen.queryByTestId('side-drawer')).not.toBeInTheDocument();
  });

  it('renders the user name', () => {
    render(<SideDrawer {...defaultProps} />);
    expect(screen.getByText('Mariana')).toBeInTheDocument();
  });

  it('renders correct post count for current user', () => {
    render(<SideDrawer {...defaultProps} />);
    expect(screen.getByText('1 post')).toBeInTheDocument();
  });

  it('renders Perfil navigation item', () => {
    render(<SideDrawer {...defaultProps} />);
    expect(screen.getByRole('button', { name: /perfil/i })).toBeInTheDocument();
  });

  it('renders Configurações navigation item', () => {
    render(<SideDrawer {...defaultProps} />);
    expect(screen.getByRole('button', { name: /configurações/i })).toBeInTheDocument();
  });

  it('renders Sair da conta button', () => {
    render(<SideDrawer {...defaultProps} />);
    expect(screen.getByRole('button', { name: /sair da conta/i })).toBeInTheDocument();
  });

  it('calls onClose when overlay is clicked', () => {
    const onClose = vi.fn();
    render(<SideDrawer {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByTestId('drawer-overlay'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when Fechar menu button is clicked', () => {
    const onClose = vi.fn();
    render(<SideDrawer {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /fechar menu/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose and onOpenProfile when Perfil is clicked', () => {
    const onClose = vi.fn();
    const onOpenProfile = vi.fn();
    render(<SideDrawer {...defaultProps} onClose={onClose} onOpenProfile={onOpenProfile} />);
    fireEvent.click(screen.getByRole('button', { name: /perfil/i }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(onOpenProfile).toHaveBeenCalledOnce();
  });

  it('calls onClose and onOpenSettings when Configurações is clicked', () => {
    const onClose = vi.fn();
    const onOpenSettings = vi.fn();
    render(<SideDrawer {...defaultProps} onClose={onClose} onOpenSettings={onOpenSettings} />);
    fireEvent.click(screen.getByRole('button', { name: /configurações/i }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(onOpenSettings).toHaveBeenCalledOnce();
  });

  it('calls onClose when Sair da conta is clicked', () => {
    const onClose = vi.fn();
    render(<SideDrawer {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /sair da conta/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
