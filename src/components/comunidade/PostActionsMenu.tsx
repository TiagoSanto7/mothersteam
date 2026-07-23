import { useState, useEffect, useRef } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';

interface PostActionsMenuProps {
  postId: string;
  isOwner: boolean; // post.authorId === currentUserId
  onDeleted?: () => void; // called after successful DELETE (parent handles navigation / cache invalidation cascade)
}

export function PostActionsMenu({ postId, isOwner, onDeleted }: PostActionsMenuProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [reported, setReported] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  // Cleanup report timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, []);

  const deleteMutation = useMutation({
    mutationFn: () => apiFetch(`/posts/${postId}`, { method: 'DELETE' }),
    onSuccess: () => {
      // Invalidate all post caches using the same predicate pattern as patchPostLikeInAllCaches
      queryClient.invalidateQueries({
        predicate: (q) => {
          const k = q.queryKey;
          return (
            Array.isArray(k) &&
            (k[0] === 'posts' || k[0] === 'communityPosts' || k[0] === 'userPosts')
          );
        },
      });
      setOpen(false);
      onDeleted?.();
    },
  });

  function handleReport() {
    // TODO(report): backend endpoint pending
    setReported(true);
    timerRef.current = setTimeout(() => {
      setReported(false);
      setOpen(false);
    }, 2000);
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        aria-label="Mais opções"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        className="w-6 h-6 flex items-center justify-center rounded-full text-graphite-muted hover:bg-sara-linen/60 transition-colors"
      >
        <MoreHorizontal size={16} />
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            aria-hidden="true"
            className="fixed inset-0 z-10"
            onClick={(e) => { e.stopPropagation(); setOpen(false); }}
          />

          {/* Popover */}
          <div
            role="menu"
            className="absolute right-0 top-7 z-20 min-w-[180px] bg-white rounded-2xl shadow-lg border border-sara-linen/60 py-1 overflow-hidden"
          >
            {reported ? (
              <p className="text-xs text-graphite-muted text-center px-4 py-3">
                Obrigada. Nosso time vai revisar.
              </p>
            ) : isOwner ? (
              <button
                role="menuitem"
                type="button"
                onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(); }}
                disabled={deleteMutation.isPending}
                className="w-full text-left px-4 py-3 text-sm text-sara-terracotta hover:bg-sara-linen/40 transition-colors disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Apagando...' : 'Apagar publicação'}
              </button>
            ) : (
              <button
                role="menuitem"
                type="button"
                onClick={(e) => { e.stopPropagation(); handleReport(); }}
                className="w-full text-left px-4 py-3 text-sm text-graphite hover:bg-sara-linen/40 transition-colors"
              >
                Reportar publicação
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
