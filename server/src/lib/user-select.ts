/**
 * Shared Prisma select object for the authenticated user's own profile.
 * Used by both /auth/me and /users/me so the two endpoints stay in sync.
 *
 * Fields: union of what auth.ts and users.ts previously selected independently.
 */
export const USER_SELECT = {
  id: true,
  email: true,
  name: true,
  username: true,
  babyName: true,
  bio: true,
  avatarUrl: true,
  pregnancyStage: true,
  pregnancyWeek: true,
  babyAgeInDays: true,
  onboardingDone: true,
  profileKey: true,
  archetypeKey: true,
  motherBirthDate: true,
  babyBirthDate: true,
  expectedBirthDate: true,
  versesPublic: true,
  role: true,
  hasMultiples: true,
  mood: true,
  supportNetwork: true,
  goal: true,
  concern: true,
  babies: { select: { id: true, name: true, birthDate: true, weekAtEntry: true } },
  otherChildren: { select: { id: true, name: true, birthDate: true } },
} as const
