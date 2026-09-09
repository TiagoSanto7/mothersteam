import { useState, useRef, useEffect, type FormEvent } from 'react';
import { ChevronLeft, ImagePlus, X } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, uploadImage } from '../../lib/api';
import { resizeImage } from '../../lib/imageUtils';
import { useAppStore } from '../../store/useAppStore';
import { ImageSourceSheet } from '../shared/ImageSourceSheet';

type Category = 'gestação' | 'pós-parto' | 'amamentação' | 'saúde mental';
type ColorKey = 'gold' | 'terracotta' | 'warm' | 'linen' | 'cream';

const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'gestação',     label: 'Gestação' },
  { value: 'pós-parto',    label: 'Pós-parto' },
  { value: 'amamentação',  label: 'Amamentação' },
  { value: 'saúde mental', label: 'Saúde Mental' },
];

const COLORS: { value: ColorKey; className: string }[] = [
  { value: 'gold',       className: 'bg-mt-rose' },
  { value: 'terracotta', className: 'bg-mt-rose-dark' },
  { value: 'warm',       className: 'bg-mt-muted' },
  { value: 'linen',      className: 'bg-mt-linen' },
  { value: 'cream',      className: 'bg-mt-cream' },
];

const COLOR_MAP: Record<ColorKey, string> = {
  gold:       'bg-mt-rose',
  terracotta: 'bg-mt-rose-dark',
  warm:       'bg-mt-muted',
  linen:      'bg-mt-linen',
  cream:      'bg-mt-cream',
};

interface CreateCommunityScreenProps {
  onCreated: (id: string) => void;
  onBack: () => void;
}

function Toggle({ checked, onChange, id }: { checked: boolean; onChange: (v: boolean) => void; id: string }) {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
        checked ? 'bg-mt-rose' : 'bg-mt-linen'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

export function CreateCommunityScreen({ onCreated, onBack }: CreateCommunityScreenProps) {
  const accessToken = useAppStore((s) => s.accessToken);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Category>('gestação');
  const [colorKey, setColorKey] = useState<ColorKey>('gold');
  const [isPrivate, setIsPrivate] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showImageSheet, setShowImageSheet] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Revoke object URL on unmount
  useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    };
  }, [imagePreviewUrl]);

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      let imageUrl: string | undefined;
      if (imageFile) {
        const resized = await resizeImage(imageFile, 1200, 800, 0.85);
        imageUrl = await uploadImage(resized, accessToken);
      }
      return apiFetch<{ id: string }>('/communities', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim(), description: description.trim(), category, colorKey, imageUrl, isPrivate, isOpen }),
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['communities'] });
      onCreated(data.id);
    },
    onError: (err) => {
      setUploadError(err instanceof Error ? err.message : 'Erro ao criar comunidade');
    },
  });

  const valid = name.trim().length > 0 && description.trim().length > 0;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setUploadError(null);
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

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (valid) mutate();
  }

  return (
    <div className="flex flex-col w-full h-full bg-mt-cream overflow-hidden">
      <div className="flex items-center gap-3 px-4 pt-6 pb-3 flex-shrink-0">
        <button type="button" onClick={onBack} aria-label="Voltar" className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-mt-linen">
          <ChevronLeft size={20} className="text-mt-charcoal" />
        </button>
        <h1 className="text-base font-semibold text-mt-charcoal">Nova comunidade</h1>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-4 pb-4 flex flex-col gap-4">

        {/* Cover photo picker */}
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium text-mt-muted">Foto de capa (opcional)</p>
          <div className="relative w-full h-28 rounded-2xl overflow-hidden bg-white border border-mt-linen">
            {imagePreviewUrl ? (
              <>
                <img
                  src={imagePreviewUrl}
                  alt="Pré-visualização da capa"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  aria-label="Remover foto de capa"
                  className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1"
                >
                  <X size={14} />
                </button>
              </>
            ) : (
              <div
                className={`w-full h-full flex flex-col items-center justify-center gap-1 cursor-pointer ${COLOR_MAP[colorKey]} opacity-30`}
              />
            )}
            {/* Overlay button to open picker when no image */}
            {!imagePreviewUrl && (
              <button
                type="button"
                onClick={() => setShowImageSheet(true)}
                className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-mt-muted hover:text-mt-charcoal transition-colors"
                aria-label="Selecionar foto de capa"
              >
                <ImagePlus size={24} />
                <span className="text-xs font-medium">Adicionar foto</span>
              </button>
            )}
          </div>
          {imagePreviewUrl && (
            <button
              type="button"
              onClick={() => setShowImageSheet(true)}
              className="flex items-center gap-1.5 text-xs text-mt-rose font-medium mt-0.5"
            >
              <ImagePlus size={14} />
              Trocar foto
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
            data-testid="cover-file-input"
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
          {uploadError && (
            <p className="text-xs text-red-500">{uploadError}</p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="cc-name" className="text-xs font-medium text-mt-muted">Nome</label>
          <input
            id="cc-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Gestantes de 2027"
            className="w-full px-4 py-3 rounded-2xl bg-white border border-mt-linen text-sm text-mt-charcoal focus:outline-none focus:border-mt-rose"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="cc-description" className="text-xs font-medium text-mt-muted">Descrição</label>
          <textarea
            id="cc-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Para quem é essa comunidade?"
            className="w-full px-4 py-3 rounded-2xl bg-white border border-mt-linen text-sm text-mt-charcoal resize-none focus:outline-none focus:border-mt-rose"
          />
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-mt-muted">Categoria</p>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setCategory(c.value)}
                aria-pressed={category === c.value}
                className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                  category === c.value ? 'bg-mt-rose text-white' : 'bg-white text-mt-muted border border-mt-linen'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-mt-muted">Cor</p>
          <div className="flex gap-2">
            {COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setColorKey(c.value)}
                aria-label={c.value}
                aria-pressed={colorKey === c.value}
                className={`w-10 h-10 rounded-full ${c.className} ${colorKey === c.value ? 'ring-2 ring-mt-charcoal ring-offset-2' : ''}`}
              />
            ))}
          </div>
        </div>

        {/* Privacy settings */}
        <div className="flex flex-col gap-3 bg-white/60 rounded-mt p-3">
          <p className="text-xs font-semibold text-mt-charcoal">Privacidade</p>

          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <label htmlFor="cc-private" className="text-xs font-medium text-mt-charcoal">
                {isPrivate ? 'Apenas membros' : 'Posts visíveis para todos'}
              </label>
              <p className="text-[10px] text-mt-muted">
                {isPrivate
                  ? 'Somente membros podem ver as publicações'
                  : 'Qualquer pessoa pode ver as publicações'}
              </p>
            </div>
            <Toggle id="cc-private" checked={isPrivate} onChange={setIsPrivate} />
          </div>

          <div className="border-t border-mt-linen/50" />

          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <label htmlFor="cc-closed" className="text-xs font-medium text-mt-charcoal">
                {isOpen ? 'Entrada livre' : 'Comunidade fechada'}
              </label>
              <p className="text-[10px] text-mt-muted">
                {isOpen
                  ? 'Qualquer pessoa pode entrar'
                  : 'Somente a admin pode adicionar membros'}
              </p>
            </div>
            <Toggle id="cc-closed" checked={!isOpen} onChange={(v) => setIsOpen(!v)} />
          </div>
        </div>

        <button
          type="submit"
          disabled={!valid || isPending}
          className="w-full py-3 rounded-2xl bg-mt-rose text-white text-sm font-semibold active:scale-95 transition-transform disabled:opacity-50 mt-2"
        >
          {isPending ? 'Criando…' : 'Criar comunidade'}
        </button>
      </form>
    </div>
  );
}
