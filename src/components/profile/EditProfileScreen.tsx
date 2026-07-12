import { useState, useEffect, type FormEvent } from 'react';
import { ChevronLeft } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '../../store/useAppStore';
import { apiFetch } from '../../lib/api';
import { patchUserProfileInCaches } from '../../lib/helpers';
import type { ApiUser, ApiUserProfile } from '../../lib/types';

interface EditProfileScreenProps {
  onBack: () => void;
}

export function EditProfileScreen({ onBack }: EditProfileScreenProps) {
  const currentUserId = useAppStore((s) => s.currentUserId);
  const motherName = useAppStore((s) => s.motherName);
  const queryClient = useQueryClient();

  const [name, setName] = useState(motherName);
  const [bio, setBio] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data: profile } = useQuery({
    queryKey: ['user', currentUserId],
    queryFn: () => apiFetch<ApiUserProfile>(`/users/${currentUserId}`),
    enabled: !!currentUserId,
  });

  useEffect(() => {
    if (profile?.bio) setBio(profile.bio);
  }, [profile?.bio]);

  const { mutate, isPending } = useMutation({
    mutationFn: (data: { name: string; bio: string | null }) =>
      apiFetch<ApiUser>('/users/me', {
        method: 'PATCH',
        body: JSON.stringify({ name: data.name.trim(), bio: data.bio }),
      }),
    onSuccess: (updated) => {
      useAppStore.setState({ motherName: updated.name });
      if (currentUserId) {
        patchUserProfileInCaches(queryClient, currentUserId, {
          name: updated.name,
          bio: updated.bio ?? null,
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
    <div className="flex flex-col w-full h-full sm:w-[390px] sm:h-[844px] bg-gradient-to-b from-[#F5EDE0] via-[#EAD8C8] to-[#D9C4AF] sm:rounded-[44px] sm:shadow-2xl overflow-hidden">
      <div className="flex items-center gap-3 px-4 pt-6 pb-3 flex-shrink-0">
        <button onClick={onBack} aria-label="Voltar" className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-sara-linen">
          <ChevronLeft size={20} className="text-graphite" />
        </button>
        <h1 className="text-base font-semibold text-graphite">Editar perfil</h1>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-4 flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="edit-name" className="text-xs font-medium text-graphite-muted">Nome</label>
          <input
            id="edit-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            className="w-full px-4 py-3 rounded-2xl bg-white border border-sara-linen text-sm text-graphite focus:outline-none focus:border-sara-gold"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="edit-bio" className="text-xs font-medium text-graphite-muted">Bio</label>
          <textarea
            id="edit-bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={280}
            rows={4}
            placeholder="Como você se sente hoje na maternidade?"
            className="w-full px-4 py-3 rounded-2xl bg-white border border-sara-linen text-sm text-graphite resize-none focus:outline-none focus:border-sara-gold"
          />
          <span aria-live="polite" className="text-[10px] text-graphite-muted self-end">{bio.length}/280</span>
        </div>

        {error && (
          <p role="alert" className="text-xs text-sara-terracotta">{error}</p>
        )}

        <button
          type="submit"
          disabled={!valid || isPending}
          className="w-full py-3 rounded-2xl bg-sara-gold text-white text-sm font-semibold active:scale-95 transition-transform disabled:opacity-50 mt-2"
        >
          {isPending ? 'Salvando…' : 'Salvar'}
        </button>
      </form>
    </div>
  );
}
