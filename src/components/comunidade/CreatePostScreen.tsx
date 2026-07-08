import { useState, useRef } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import type { CommunityPost } from '../../types';

type PostCategory = CommunityPost['category'];

const CATEGORIES: { value: PostCategory; label: string }[] = [
  { value: 'gestação',      label: 'Gestação' },
  { value: 'pós-parto',    label: 'Pós-parto' },
  { value: 'amamentação',  label: 'Amamentação' },
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
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.onerror = () => console.error('Falha ao carregar imagem');
    reader.readAsDataURL(file);
  }

  function handlePublish() {
    if (!content.trim()) return;
    addCommunityPost({
      author: motherName,
      content: content.trim(),
      category,
      imageUrl: imagePreview ?? undefined,
    });
    onBack();
  }

  return (
    <div className="flex flex-col gap-4 pb-6 h-full">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <button
          onClick={onBack}
          className="text-sm text-graphite-muted font-medium px-1 py-1"
        >
          Cancelar
        </button>
        <h1 className="text-sm font-semibold text-graphite">Publicação</h1>
        <button
          onClick={handlePublish}
          disabled={!content.trim()}
          className="text-sm font-semibold text-sara-gold disabled:opacity-40 px-1 py-1"
        >
          Publicar
        </button>
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

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
          data-testid="file-input"
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          aria-label="Adicionar foto"
          className="flex items-center gap-2 text-sm text-sara-gold font-medium"
        >
          <ImagePlus size={18} />
          Adicionar foto
        </button>

        {imagePreview && (
          <div className="relative mt-1">
            <img
              src={imagePreview}
              alt="Preview"
              className="w-full rounded-xl object-cover max-h-48"
            />
            <button
              onClick={() => {
                setImagePreview(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              aria-label="Remover imagem"
              className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1"
            >
              <X size={14} />
            </button>
          </div>
        )}

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

    </div>
  );
}
