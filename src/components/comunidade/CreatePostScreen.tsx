import { useState, useRef, useEffect } from 'react';
import { ImagePlus, X, Users, ChevronDown, Check } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import type { CommunityPost } from '../../types';
import type { ApiCommunity } from '../../lib/types';
import { apiFetch } from '../../lib/api';
import { MentionInput } from '../shared/MentionInput';
import { ImageSourceSheet } from '../shared/ImageSourceSheet';
import { usePublishPost } from './publishing';

type PostCategory = CommunityPost['category'];
type ApiCommunityWithMember = ApiCommunity & { isMember?: boolean };

const CATEGORIES: { value: PostCategory; label: string }[] = [
  { value: 'gestação',      label: 'Gestação' },
  { value: 'pós-parto',    label: 'Pós-parto' },
  { value: 'amamentação',  label: 'Amamentação' },
  { value: 'saúde mental', label: 'Saúde Mental' },
];

const COLOR_MAP: Record<string, string> = {
  gold:       'bg-mt-rose',
  terracotta: 'bg-mt-rose-dark',
  warm:       'bg-mt-muted',
  linen:      'bg-mt-linen',
  cream:      'bg-mt-cream',
};

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
  // undefined = feed geral (sem comunidade). Pré-selecionada quando aberto de
  // dentro de uma comunidade, mas sempre trocável — ver TIA-69.
  const [selectedCommunityId, setSelectedCommunityId] = useState<string | undefined>(initialCommunityId);
  const [showCommunityPicker, setShowCommunityPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const communityPickerRef = useRef<HTMLDivElement>(null);

  // Fecha o balão ao tocar fora — mesmo padrão do dropdown de @menções em
  // MentionInput.tsx. O ref cobre o botão-gatilho junto com o balão, então
  // tocar no próprio botão não soma um segundo toggle vindo deste listener.
  useEffect(() => {
    if (!showCommunityPicker) return;
    function handler(e: MouseEvent) {
      if (communityPickerRef.current && !communityPickerRef.current.contains(e.target as Node)) {
        setShowCommunityPicker(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showCommunityPicker]);

  // Mesma queryKey/queryFn de ComunidadesScreen — reaproveita o cache.
  const { data: apiCommunities = [] } = useQuery({
    queryKey: ['communities'],
    queryFn: () => apiFetch<ApiCommunityWithMember[]>('/communities?includeMember=1'),
  });
  const myCommunities = apiCommunities.filter((c) => c.isMember);
  const selectedCommunity = myCommunities.find((c) => c.id === selectedCommunityId);

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
    publish({ content: content.trim(), category, communityId: selectedCommunityId, imageFile });
    onBack();
  }

  const canPublish = Boolean(content.trim() || imageFile);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 pt-4 pb-2 flex-shrink-0">
        <button
          onClick={onBack}
          className="text-sm text-mt-muted font-medium px-1 py-1"
        >
          Cancelar
        </button>
        <h1 className="text-sm font-semibold text-mt-charcoal">Publicação</h1>
        {/* Invisible twin do "Cancelar" — mantém o título centralizado agora que
            "Publicar" saiu do header e foi pro rodapé (ver TIA-69). */}
        <span aria-hidden="true" className="invisible text-sm font-medium px-1 py-1">Cancelar</span>
      </div>

      <div className="px-4 flex flex-col gap-3 flex-1 overflow-y-auto">
        <MentionInput
          value={content}
          onChange={setContent}
          placeholder="O que você está sentindo? Este é um espaço seguro 💜"
          rows={7}
          aria-label="Conteúdo do post"
          // Impede que o toque vire o gesto de arrastar-pra-fechar do sheet
          // (ComunidadeScreen) — sem isso, tocar no texto pra posicionar o
          // cursor ou selecionar às vezes iniciava o fechamento do modal.
          onPointerDownCapture={(e: React.PointerEvent) => e.stopPropagation()}
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

      <div className="px-4 pt-3 pb-6 flex-shrink-0 flex flex-col gap-2">
        <div className="relative" ref={communityPickerRef}>
          {showCommunityPicker && (
            <div
              role="listbox"
              aria-label="Escolher comunidade de destino"
              onPointerDownCapture={(e) => e.stopPropagation()}
              className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-mt-linen rounded-2xl shadow-mt-lg p-2 max-h-56 overflow-y-auto z-10"
            >
              <p className="text-[10px] font-semibold uppercase tracking-wide text-mt-muted px-2 pt-1 pb-1.5">Comunidades</p>
              <button
                type="button"
                role="option"
                aria-selected={!selectedCommunityId}
                onClick={() => { setSelectedCommunityId(undefined); setShowCommunityPicker(false); }}
                className="w-full flex items-center gap-2 px-2 py-2 rounded-xl text-left hover:bg-mt-cream"
              >
                <span className="w-5 h-5 rounded-full bg-mt-linen flex-shrink-0" />
                <span className="text-sm flex-1 text-mt-charcoal">Feed geral</span>
                {!selectedCommunityId && <Check size={15} className="text-mt-rose" />}
              </button>
              {myCommunities.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  role="option"
                  aria-selected={selectedCommunityId === c.id}
                  onClick={() => { setSelectedCommunityId(c.id); setShowCommunityPicker(false); }}
                  className="w-full flex items-center gap-2 px-2 py-2 rounded-xl text-left hover:bg-mt-cream"
                >
                  <span className={`w-5 h-5 rounded-full flex-shrink-0 ${COLOR_MAP[c.colorKey] ?? 'bg-mt-rose'}`} />
                  <span className="text-sm flex-1 text-mt-charcoal truncate">{c.name}</span>
                  {selectedCommunityId === c.id && <Check size={15} className="text-mt-rose flex-shrink-0" />}
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowCommunityPicker((v) => !v)}
            aria-expanded={showCommunityPicker}
            className="w-full flex items-center justify-between gap-2 text-xs font-medium text-mt-muted px-3 py-2 rounded-full bg-mt-cream"
          >
            <span className="flex items-center gap-1.5 min-w-0">
              <Users size={13} className="flex-shrink-0" />
              <span className="truncate">Publicar em {selectedCommunity ? selectedCommunity.name : 'Feed geral'}</span>
            </span>
            <ChevronDown size={14} className="flex-shrink-0" />
          </button>
        </div>

        <button
          onClick={handlePublish}
          disabled={!canPublish}
          className="w-full py-3 rounded-2xl bg-mt-rose text-white text-sm font-semibold active:scale-95 transition-transform disabled:opacity-50"
        >
          Publicar
        </button>
      </div>
    </div>
  );
}
