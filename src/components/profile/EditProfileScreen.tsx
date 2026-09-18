import { useState, useEffect, useRef, type FormEvent } from 'react';
import { ChevronLeft, Camera, Loader2 } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '../../store/useAppStore';
import { apiFetch, uploadImage, resolveMediaUrl } from '../../lib/api';
import { resizeImage } from '../../lib/imageUtils';
import { patchUserProfileInCaches } from '../../lib/helpers';
import type { ApiUser, ApiUserProfile } from '../../lib/types';
import { getAvatarColor } from '../../utils/avatar';
import { ImageSourceSheet } from '../shared/ImageSourceSheet';
import { ImageCropModal } from '../shared/ImageCropModal';

interface EditProfileScreenProps {
  onBack: () => void;
}

// Checagem só pra não jogar um arquivo absurdo no decode <img> do crop modal —
// não é o limite real de upload (esse continua sendo os 5MB do servidor,
// que nunca chegam a ser testados na prática porque o crop já entrega ~280x280).
const MAX_PHOTO_PICK_BYTES = 20 * 1024 * 1024;

/** Traduz o erro de cada etapa do fluxo de foto pra uma mensagem curta e específica. */
function describePhotoError(stage: 'resize' | 'upload' | 'save', err: unknown): string {
  if (err instanceof TypeError) {
    // fetch() lança TypeError puro pra falha de rede (sem conexão, DNS, CORS) —
    // não tem status HTTP pra inspecionar nesse caso.
    return 'Sem conexão com a internet. Verifique sua rede e tente de novo.';
  }
  if (stage === 'upload' && err instanceof Error) {
    const match = err.message.match(/^Upload failed: ([\s\S]*)$/);
    if (match) {
      try {
        const body = JSON.parse(match[1]) as { error?: string };
        if (body.error === 'File too large') return 'Essa foto é muito grande. Tenta uma imagem menor.';
        if (body.error === 'Unsupported file type') return 'Esse formato de imagem não é aceito.';
        if (body.error) return 'Não foi possível processar essa imagem. Tenta outra foto.';
      } catch {
        // corpo não era JSON — cai no genérico de upload abaixo
      }
    }
  }
  if (stage === 'resize') return 'Não foi possível processar essa imagem. Tenta outra foto.';
  if (stage === 'save') return 'A foto foi enviada, mas não deu pra salvar no perfil. Tente novamente.';
  return 'Não foi possível enviar a foto. Tente novamente.';
}

export function EditProfileScreen({ onBack }: EditProfileScreenProps) {
  const currentUserId = useAppStore((s) => s.currentUserId);
  const motherName = useAppStore((s) => s.motherName);
  const accessToken = useAppStore((s) => s.accessToken);
  const queryClient = useQueryClient();

  const [name, setName] = useState(motherName);
  const [bio, setBio] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showImageSheet, setShowImageSheet] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const { data: profile } = useQuery({
    queryKey: ['user', currentUserId],
    queryFn: () => apiFetch<ApiUserProfile>(`/users/${currentUserId}`),
    enabled: !!currentUserId,
  });

  const username = profile?.username ?? null;
  const avatarColor = getAvatarColor(profile?.archetypeKey ?? null);
  const avatarLetter = (name || 'M').charAt(0).toUpperCase();
  const avatarUrl = profile?.avatarUrl ?? null;

  useEffect(() => {
    if (profile?.bio) setBio(profile.bio);
  }, [profile?.bio]);

  const { mutate, isPending } = useMutation({
    mutationFn: (data: { name: string; bio: string | null; avatarUrl?: string | null }) =>
      apiFetch<ApiUser>('/users/me', {
        method: 'PATCH',
        body: JSON.stringify({ name: data.name.trim(), bio: data.bio, ...(data.avatarUrl !== undefined ? { avatarUrl: data.avatarUrl } : {}) }),
      }),
    onSuccess: (updated) => {
      useAppStore.setState({ motherName: updated.name });
      if (currentUserId) {
        patchUserProfileInCaches(queryClient, currentUserId, {
          name: updated.name,
          bio: updated.bio ?? null,
          ...(updated.avatarUrl !== undefined ? { avatarUrl: updated.avatarUrl ?? null } : {}),
        });
      }
      onBack();
    },
    onError: () => {
      setError('Não foi possível salvar. Tente novamente.');
    },
  });

  const valid = name.trim().length > 0;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setError(null);
    mutate({ name, bio: bio.trim() || null });
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Esse arquivo não é uma imagem.');
      return;
    }
    if (file.size > MAX_PHOTO_PICK_BYTES) {
      setError('Essa foto é muito grande (máx. 20MB). Tenta outra ou tire uma foto nova.');
      return;
    }
    setError(null);
    const url = URL.createObjectURL(file);
    setCropSrc(url);
  }

  function handleCropError() {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
    setError('Não foi possível abrir essa imagem. Tenta outra foto.');
  }

  async function handleCropConfirm(blob: Blob) {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
    setError(null);
    setIsUploading(true);

    const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });

    let resized: File;
    try {
      resized = await resizeImage(file, 400, 400, 0.9);
    } catch (err) {
      setError(describePhotoError('resize', err));
      setIsUploading(false);
      return;
    }

    let url: string;
    try {
      url = await uploadImage(resized, accessToken);
    } catch (err) {
      setError(describePhotoError('upload', err));
      setIsUploading(false);
      return;
    }

    try {
      await apiFetch<ApiUser>('/users/me', {
        method: 'PATCH',
        body: JSON.stringify({ avatarUrl: url }),
      });
    } catch (err) {
      setError(describePhotoError('save', err));
      setIsUploading(false);
      return;
    }

    if (currentUserId) {
      patchUserProfileInCaches(queryClient, currentUserId, { avatarUrl: url });
      queryClient.invalidateQueries({ queryKey: ['user', currentUserId] });
    }
    setIsUploading(false);
  }

  return (
    <div className="flex flex-col w-full h-full bg-mt-cream overflow-hidden">
      <div className="flex items-center gap-3 px-4 pt-6 pb-3 flex-shrink-0">
        <button onClick={onBack} aria-label="Voltar" className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-mt-linen">
          <ChevronLeft size={20} className="text-mt-charcoal" />
        </button>
        <h1 className="text-base font-semibold text-mt-charcoal">Editar perfil</h1>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-4 flex flex-col gap-4">
        {/* Avatar with upload */}
        <div className="flex flex-col items-center gap-2 pt-2 pb-1">
          <div className="relative">
            {avatarUrl ? (
              <img
                src={resolveMediaUrl(avatarUrl)}
                alt="Foto de perfil"
                className="w-20 h-20 rounded-full object-cover select-none"
              />
            ) : (
              <div
                style={{ background: avatarColor }}
                className="w-20 h-20 rounded-full flex items-center justify-center text-white text-3xl font-bold select-none"
                aria-hidden="true"
              >
                {avatarLetter}
              </div>
            )}
            <button
              type="button"
              aria-label="Alterar foto de perfil"
              disabled={isUploading}
              onClick={() => setShowImageSheet(true)}
              className="absolute inset-0 rounded-full bg-black/40 flex flex-col items-center justify-center gap-0.5 cursor-pointer disabled:cursor-wait"
            >
              {isUploading ? (
                <Loader2 size={18} className="text-white animate-spin" />
              ) : (
                <>
                  <Camera size={18} className="text-white" />
                  <span className="text-[9px] text-white font-medium leading-tight">Alterar</span>
                </>
              )}
            </button>
          </div>
          <p className="text-[10px] text-mt-muted">Foto de perfil</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            aria-label="Selecionar foto da galeria"
            className="hidden"
            onChange={handleFileChange}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            aria-label="Tirar foto"
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
        </div>

        {/* Read-only username */}
        {username && (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-mt-muted">Nome de usuário</label>
            <div className="w-full px-4 py-3 rounded-2xl bg-white/60 border border-mt-linen text-sm text-mt-muted select-none cursor-default">
              @{username}
            </div>
            <p className="text-[10px] text-mt-muted pl-1">O nome de usuário não pode ser alterado aqui.</p>
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label htmlFor="edit-name" className="text-xs font-medium text-mt-muted">Nome</label>
          <input
            id="edit-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            className="w-full px-4 py-3 rounded-2xl bg-white border border-mt-linen text-sm text-mt-charcoal focus:outline-none focus:border-mt-rose"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="edit-bio" className="text-xs font-medium text-mt-muted">Bio</label>
          <textarea
            id="edit-bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={280}
            rows={4}
            placeholder="Como você se sente hoje na maternidade?"
            className="w-full px-4 py-3 rounded-2xl bg-white border border-mt-linen text-sm text-mt-charcoal resize-none focus:outline-none focus:border-mt-rose"
          />
          <span aria-live="polite" className="text-[10px] text-mt-muted self-end">{bio.length}/280</span>
        </div>

        {error && (
          <p role="alert" className="text-xs text-mt-rose-dark">{error}</p>
        )}

        <button
          type="submit"
          disabled={!valid || isPending}
          className="w-full py-3 rounded-2xl bg-mt-rose text-white text-sm font-semibold active:scale-95 transition-transform disabled:opacity-50 mt-2"
        >
          {isPending ? 'Salvando…' : 'Salvar'}
        </button>
      </form>
      {cropSrc && (
        <ImageCropModal
          imageSrc={cropSrc}
          aspectRatio={1}
          onConfirm={handleCropConfirm}
          onCancel={() => { URL.revokeObjectURL(cropSrc!); setCropSrc(null); }}
          onError={handleCropError}
        />
      )}
    </div>
  );
}
