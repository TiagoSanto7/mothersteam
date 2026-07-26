import { useState } from 'react';
import { X, Repeat2 } from 'lucide-react';
import { motion } from 'framer-motion';
import type { CommunityPost } from '../../types';

interface QuoteRepostSheetProps {
  post: CommunityPost;
  onClose: () => void;
  /** Called with undefined for a plain repost, or the quote text for a quote repost. */
  onConfirm: (quoteText?: string) => void;
  isPending?: boolean;
}

export function QuoteRepostSheet({ post, onClose, onConfirm, isPending }: QuoteRepostSheetProps) {
  const [comment, setComment] = useState('');

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Republicar post"
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[390px] bg-sara-linen/95 backdrop-blur-md rounded-t-[32px] z-50 px-5 pt-5 pb-10 flex flex-col gap-4 shadow-2xl"
      >
        {/* Drag handle + header */}
        <div className="flex items-center justify-between">
          <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto absolute left-1/2 -translate-x-1/2 top-3" />
          <h2 className="text-base font-semibold font-serif text-graphite pt-2">Republicar</h2>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
          >
            <X size={14} className="text-graphite-muted" strokeWidth={2} />
          </button>
        </div>

        {/* Optional comment textarea */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-graphite-muted" htmlFor="quote-comment">
            Adicionar um comentário (opcional)
          </label>
          <textarea
            id="quote-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="O que você pensa sobre isso?"
            rows={3}
            className="w-full px-4 py-3 rounded-2xl bg-white border border-sara-linen text-sm text-graphite placeholder:text-sara-muted resize-none focus:outline-none focus:border-sara-gold"
          />
        </div>

        {/* Preview of the original post */}
        <div className="border border-sara-linen rounded-2xl p-3 bg-white/70">
          <p className="text-[11px] font-semibold text-graphite mb-0.5">{post.author}</p>
          {post.authorUsername && (
            <span className="text-[10px] text-graphite-muted/70">@{post.authorUsername} · </span>
          )}
          <p className="text-xs text-graphite-light leading-relaxed line-clamp-3 mt-1">{post.content}</p>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          {/* Plain repost — always available */}
          <motion.button
            onClick={() => { if (!isPending) onConfirm(undefined); }}
            disabled={isPending}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="flex-1 py-3 rounded-2xl border-2 border-sara-gold text-sara-gold text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-1.5"
          >
            <Repeat2 size={15} strokeWidth={2} />
            Repostar
          </motion.button>

          {/* Quote post — only enabled when textarea has text */}
          <motion.button
            onClick={() => { if (!isPending && comment.trim()) onConfirm(comment.trim()); }}
            disabled={!comment.trim() || isPending}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="flex-1 py-3 rounded-2xl bg-sara-gold text-white text-sm font-semibold disabled:opacity-40"
          >
            Citar
          </motion.button>
        </div>
      </div>
    </>
  );
}
