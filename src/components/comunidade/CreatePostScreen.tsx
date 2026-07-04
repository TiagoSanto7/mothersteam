import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import type { CommunityPost } from '../../types';

type PostCategory = CommunityPost['category'];

const CATEGORIES: { value: PostCategory; label: string }[] = [
  { value: 'gestação',     label: 'Gestação' },
  { value: 'pós-parto',   label: 'Pós-parto' },
  { value: 'amamentação', label: 'Amamentação' },
  { value: 'saúde mental', label: 'Saúde Mental' },
];

interface CreatePostScreenProps {
  onBack: () => void;
}

export function CreatePostScreen({ onBack }: CreatePostScreenProps) {
  const addCommunityPost = useAppStore((s) => s.addCommunityPost);
  const motherName = useAppStore((s) => s.motherName);
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<PostCategory>('saúde mental');

  function handlePublish() {
    if (!content.trim()) return;
    addCommunityPost({ author: motherName, content: content.trim(), category });
    onBack();
  }

  return (
    <div className="flex flex-col gap-4 pb-6 h-full">
      <div className="flex items-center gap-3 px-4 pt-4">
        <button
          onClick={onBack}
          aria-label="Voltar"
          className="w-9 h-9 rounded-xl bg-sara-linen flex items-center justify-center"
        >
          <ArrowLeft size={18} className="text-sara-gold" strokeWidth={1.8} />
        </button>
        <h1 className="text-base font-semibold text-graphite">Desabafar</h1>
      </div>

      <div className="px-4 flex flex-col gap-3 flex-1">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="O que você está sentindo? Este é um espaço seguro 💜"
          autoFocus
          rows={7}
          className="w-full px-4 py-3 rounded-2xl bg-white border border-sara-linen text-sm text-graphite placeholder:text-graphite-muted leading-relaxed resize-none focus:outline-none focus:border-sara-gold"
        />

        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-graphite-muted">Categoria</p>
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setCategory(cat.value)}
                aria-pressed={category === cat.value}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  category === cat.value
                    ? 'bg-sara-gold text-white'
                    : 'bg-white text-graphite-muted border border-sara-linen'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4">
        <button
          onClick={handlePublish}
          disabled={!content.trim()}
          className="w-full py-3.5 rounded-2xl bg-sara-gold text-white text-sm font-semibold active:scale-95 transition-transform disabled:opacity-40"
        >
          Publicar 💜
        </button>
      </div>
    </div>
  );
}
