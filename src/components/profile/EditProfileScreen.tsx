import { useState, useEffect, type FormEvent } from 'react';
import { ChevronLeft, Camera, Loader2 } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '../../store/useAppStore';
import { apiFetch, resolveMediaUrl } from '../../lib/api';
import { patchUserProfileInCaches } from '../../lib/helpers';
import type { ApiUser, ApiUserProfile } from '../../lib/types';
import { getAvatarColor } from '../../utils/avatar';
import { useAvatarPicker } from '../../hooks/useAvatarPicker';

interface EditProfileScreenProps {
  onBack: () => void;
}

/** Erro específico de salvar a foto no perfil, depois que o upload já deu certo
 * (useAvatarPicker cobre os erros de escolher/redimensionar/enviar). */
function describeSaveError(err: unknown): string {
  if (err instanceof TypeError) return 'Sem conexão com a internet. Verifique sua rede e tente de novo.';
  return 'A foto foi enviada, mas não deu pra salvar no perfil. Tente novamente.';
}

export function EditProfileScreen({ onBack }: EditProfileScreenProps) {
  const currentUserId = useAppStore((s) => s.currentUserId);
  const motherName = useAppStore((s) => s.motherName);
  const accessToken = useAppStore((s) => s.accessToken);
  const queryClient = useQueryClient();

  const [name, setName] = useState(motherName);
  const [bio, setBio] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { openPicker, pickerElements, isUploading } = useAvatarPicker({
    accessToken,
    onError: setError,
    onUploaded: async (url) => {
      setError(null);
      try {
        await apiFetch<ApiUser>('/users/me', { method: 'PATCH', body: JSON.stringify({ avatarUrl: url }) });
      } catch (err) {
        setError(describeSaveError(err));
        return;
      }
      if (currentUserId) {
        patchUserProfileInCaches(queryClient, currentUserId, { avatarUrl: url });
        queryClient.invalidateQueries({ queryKey: ['user', currentUserId] });
      }
    },
  });

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
              onClick={openPicker}
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
      {pickerElements}
    </div>
  );
}
