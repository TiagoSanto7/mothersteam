import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Check, RotateCcw, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { PostCard } from './PostCard';
import { pendingToCommunityPost, usePublishNotice, type PendingPost } from './publishing';

const NOOP = () => {};

interface PendingPostCardProps {
  pending: PendingPost;
  onRetry: (tempId: string) => void;
  onDiscard: (tempId: string) => void;
}

/** A post that is still being sent (or failed): same card, muted, with its status underneath. */
export function PendingPostCard({ pending, onRetry, onDiscard }: PendingPostCardProps) {
  const motherName = useAppStore((s) => s.motherName);
  const currentUserId = useAppStore((s) => s.currentUserId);
  const reduceMotion = useReducedMotion();
  const failed = pending.status === 'failed';

  return (
    <motion.div
      layout
      initial={reduceMotion ? false : { opacity: 0, y: -12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
      data-testid="pending-post"
      className="flex flex-col gap-1.5"
    >
      {/* Interactions make no sense until the post exists on the server. */}
      <div aria-hidden="true" className={`pointer-events-none transition-opacity duration-200 ${failed ? 'opacity-50' : 'opacity-70'}`}>
        <PostCard post={pendingToCommunityPost(pending, motherName, currentUserId)} onOpen={NOOP} onOpenProfile={NOOP} />
      </div>

      {failed ? (
        <div role="alert" className="flex items-center justify-between gap-2 px-1">
          <span className="text-[12px] font-medium text-mt-rose-dark">Não publicado</span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onDiscard(pending.tempId)}
              aria-label="Descartar publicação"
              className="h-8 px-3 rounded-full text-[12px] font-semibold text-mt-muted flex items-center gap-1 active:scale-95 transition-transform"
            >
              <X size={13} strokeWidth={2.4} aria-hidden="true" /> Descartar
            </button>
            <button
              type="button"
              onClick={() => onRetry(pending.tempId)}
              className="h-8 px-3 rounded-full bg-mt-rose text-white text-[12px] font-semibold flex items-center gap-1 shadow-sm active:scale-95 transition-transform"
            >
              <RotateCcw size={13} strokeWidth={2.4} aria-hidden="true" /> Tentar de novo
            </button>
          </div>
        </div>
      ) : (
        <div role="status" aria-live="polite" className="flex flex-col gap-1 px-1">
          <span className="text-[12px] text-mt-muted">
            Publicando…
            {pending.progress !== null && ` ${Math.round(pending.progress * 100)}%`}
          </span>
          <div className="h-1 rounded-full bg-mt-linen overflow-hidden">
            {pending.progress !== null ? (
              <motion.div
                className="h-full bg-mt-rose origin-left"
                initial={false}
                animate={{ scaleX: Math.max(pending.progress, 0.04) }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              />
            ) : (
              <div className="h-full w-1/3 bg-mt-rose rounded-full animate-[mt-indeterminate_1.1s_ease-in-out_infinite]" />
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}

/**
 * Wraps a feed card; when `active`, plays a single soft glow the moment the post becomes real.
 * Only the author sees it, only once, and nothing is stored on the server.
 */
export function JustPublishedHighlight({ active, children }: { active: boolean; children: ReactNode }) {
  const reduceMotion = useReducedMotion();
  if (!active || reduceMotion) return <>{children}</>;
  // A ring on its own layer that only fades in and out: opacity-only, cheap to animate.
  return (
    <div data-testid="just-published" className="relative">
      {children}
      <motion.span
        aria-hidden="true"
        className="pointer-events-none absolute -inset-[3px] rounded-[27px] ring-2 ring-mt-rose/60 bg-mt-rose/5"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0] }}
        transition={{ duration: 1.6, times: [0, 0.2, 1], ease: 'easeOut' }}
      />
    </div>
  );
}

/** Short "Publicado" confirmation pinned near the top of the screen. */
export function PublishNotice() {
  const notice = usePublishNotice();
  return (
    <div className="pointer-events-none fixed left-0 right-0 z-40 flex justify-center" style={{ top: 'calc(env(safe-area-inset-top) + 64px)' }}>
      <AnimatePresence>
        {notice && (
          <motion.div
            key="notice"
            role="status"
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 500, damping: 34 }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-mt-charcoal/90 text-white text-[12px] font-semibold shadow-lg"
          >
            <Check size={14} strokeWidth={2.6} aria-hidden="true" />
            {notice}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
