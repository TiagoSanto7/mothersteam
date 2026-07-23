import { useAppStore } from '../../store/useAppStore';
import { ProfileScreen } from './ProfileScreen';
import { UserProfileScreen } from './UserProfileScreen';

interface ProfileRouterProps {
  userId: string;
  onBack: () => void;
  onOpenProfile?: (userId: string) => void;
}

/** Único árbitro entre visão própria (ProfileScreen) e visão de visitante (UserProfileScreen). */
export function ProfileRouter({ userId, onBack, onOpenProfile }: ProfileRouterProps) {
  const currentUserId = useAppStore((s) => s.currentUserId);

  if (userId === currentUserId) {
    return <ProfileScreen onClose={onBack} />;
  }

  return (
    <UserProfileScreen
      key={userId}
      userId={userId}
      onBack={onBack}
      onOpenProfile={onOpenProfile}
    />
  );
}
