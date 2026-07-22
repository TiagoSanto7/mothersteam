import { useAppStore } from '../../store/useAppStore';
import { ProfileScreen } from './ProfileScreen';
import { UserProfileScreen } from './UserProfileScreen';

interface ProfileRouterProps {
  userId: string;
  onBack: () => void;
  onOpenUser?: (userId: string) => void;
}

/**
 * Escolhe entre ProfileScreen (dono) e UserProfileScreen (visitante)
 * baseado no currentUserId da sessão. Único ponto que decide isso.
 */
export function ProfileRouter({ userId, onBack, onOpenUser }: ProfileRouterProps) {
  const currentUserId = useAppStore((s) => s.currentUserId);

  if (userId === currentUserId) {
    return <ProfileScreen onClose={onBack} />;
  }

  return (
    <UserProfileScreen
      key={userId}
      userId={userId}
      onBack={onBack}
      onOpenProfile={onOpenUser}
    />
  );
}
