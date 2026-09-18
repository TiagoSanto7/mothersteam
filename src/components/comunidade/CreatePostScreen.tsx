import { useState, useRef, useEffect } from 'react';
import { ImagePlus, X } from 'lucide-react';
import type { CommunityPost } from '../../types';
import { MentionInput } from '../shared/MentionInput';
import { ImageSourceSheet } from '../shared/ImageSourceSheet';
import { usePublishPost } from './publishing';

type PostCategory = CommunityPost['category'];

const CATEGORIES: { value: PostCategory; label: string }[] = [
  { value: 'gestação',      label: 'Gestação' },
  { value: 'pós-parto',    label: 'Pós-parto' },
  { value: 'amamentação',  label: 'Amamentação' },
  { value: 'saúde mental', label: 'Saúde Mental' },
];

interface CreatePostScreenProps {
  onBack: () => void;
  autoOpenImage?: boolean;
  initialCommunityId?: string;
  initialContent?: string;
}

export function CreatePostScreen({ onBack, autoOpenImage, initialCommunityId, initialContent }: CreatePostScreenProps) {
  const [content, setContent] = useState(initialContent ?? '');
  const [category, setCategory] = useState<PostCategory>('saúde mental');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [showImageSheet, setShowImageSheet] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoOpenImage) {
      fileInputRef.current?.click();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Revoke object URL on unmount to avoid memory leaks
  useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    };
  }, [imagePreviewUrl]);

  const { publish } = usePublishPost();

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setImageFile(file);
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setImagePreviewUrl(file ? URL.createObjectURL(file) : null);
  }

  function handleRemoveImage() {
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setImageFile(null);
    setImagePreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  // Optimistic: hand the post to the publisher and close right away; the feed shows it at the
  // top with its own "Publicando…" state, so the composer never makes her wait.
  function handlePublish() {
    if (!content.trim() && !imageFile) return;
    publish({ content: content.trim(), category, communityId: initialCommunityId, imageFile });
    onBack();
  }

  const canPublish = Boolean(content.trim() || imageFile);

  return (
    <div className="flex flex-col gap-4 pb-6 h-full">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <button
          onClick={onBack}
          className="text-sm text-mt-muted font-medium px-1 py-1"
        >
          Cancelar
        </button>
        <h1 className="text-sm font-semibold text-mt-charcoal">Publicação</h1>
        <button
          onClick={handlePublish}
          disabled={!canPublish}
          className="text-sm font-semibold text-mt-rose disabled:opacity-40 px-1 py-1"
        >
          Publicar
        </button>
      </div>

      <div className="px-4 flex flex-col gap-3 flex-1">
        <MentionInput
          value={content}
          onChange={setContent}
          placeholder="O que você está sentindo? Este é um espaço seguro 💜"
          rows={7}
          aria-label="Conteúdo do post"
          autoFocus
          className="w-full px-4 py-3 rounded-2xl bg-white border border-mt-linen text-sm text-mt-charcoal placeholder:text-mt-muted leading-relaxed resize-none focus:outline-none focus:border-mt-rose"
        />

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
          data-testid="file-input"
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileChange}
        />

        {showImageSheet && (
          <ImageSourceSheet
            onCamera={() => { setShowImageSheet(false); cameraInputRef.current?.click(); }}
            onGallery={() => { setShowImageSheet(false); fileInputRef.current?.click(); }}
            onClose={() => setShowImageSheet(false)}
          />
        )}

        <button
          onClick={() => setShowImageSheet(true)}
          aria-label="Adicionar foto"
          className="flex items-center gap-2 text-sm text-mt-rose font-medium"
        >
          <ImagePlus size={18} />
          Adicionar foto
        </button>

        {imagePreviewUrl && (
          <div className="relative mt-1">
            <img
              src={imagePreviewUrl}
              alt="Preview"
              className="w-full rounded-xl object-cover max-h-48"
            />
            <button
              onClick={handleRemoveImage}
              aria-label="Remover imagem"
              className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1"
            >
              <X size={14} />
            </button>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-mt-muted">Categoria</p>
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setCategory(cat.value)}
                aria-pressed={category === cat.value}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  category === cat.value
                    ? 'bg-mt-rose text-white'
                    : 'bg-white text-mt-muted border border-mt-linen'
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
