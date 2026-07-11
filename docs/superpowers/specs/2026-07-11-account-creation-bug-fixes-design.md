# Account Creation Flow & Bug Fixes — Design Spec

## Scope

This plan covers one new feature (account registration flow) and five bug fixes identified in manual testing. Profile improvements and community navigation are scoped to separate plans.

---

## Feature: Account Creation Flow

**Entry point:** "Criar conta" button added below the "Continuar com Apple" button in `src/components/auth/LoginScreen.tsx`. Button renders with the same full-width style, using `bg-white border border-sara-linen text-graphite`.

**New component:** `src/components/auth/RegisterScreen.tsx`

The screen renders inside the same `min-h-screen sm:w-[390px]` shell used by LoginScreen. Navigation state (`step: 1 | 2`) is local `useState`. A back chevron on step 2 returns to step 1; the back chevron on step 1 returns to LoginScreen (calls `onBack` prop).

**Step 1 — Identity:**
- Campo Nome (`name`) — text, required, min 1 char
- Campo E-mail — email type, required
- Campo Senha — password type, min 8 chars, show/hide toggle (Eye icon)
- Botão "Continuar →" — disabled until all three fields are valid; advances to step 2

**Step 2 — Dados gestacionais:**
- Toggle segmentado "Grávida / Pós-parto" (`pregnancyStage: 'pregnant' | 'postpartum'`)
- If `pregnant`: number input "Semana da gravidez" (1–42, required)
- If `postpartum`: number input "Dias de vida do bebê" (≥ 0, required)
- Campo "Nome do bebê" — text, optional (`babyName`), placeholder "pode preencher depois"
- Botão "Criar conta" — calls `POST /auth/register`; shows "Criando conta…" while pending

**Mutation:**
```ts
POST /auth/register → { accessToken, user: ApiUser }
```
On success: `setAuth(accessToken, user)`. Since `onboardingDone` is `false` for new users, OnboardingScreen appears automatically — no extra navigation needed.

**Error handling:** 409 → "Este e-mail já está cadastrado."; network error → "Erro de conexão. Tente novamente."

**Backend changes (`server/src/routes/auth.ts`):**
- Add `babyName: z.string().optional()` to `registerSchema`
- Add `babyName: body.data.babyName` to `prisma.user.create`
- Change `select` on register to return the same full user shape as login (adds `babyName`, `pregnancyStage`, `pregnancyWeek`, `babyAgeInDays`, `onboardingDone`, `profileKey`, `archetypeKey`)

**Security:** No change to token handling. `accessToken` stays in Zustand memory, refresh cookie stays HttpOnly.

---

## Bug Fix: Notification Toggle CSS

**File:** `src/components/profile/SettingsScreen.tsx`

**Root cause:** The toggle `<button>` has browser default padding (~6px inline). The thumb `<span>` uses `position: absolute` with no explicit `left`, so its left origin is the button's padding-left (≈6px), not 0. Adding `translate-x-4` (16px) pushes the right edge of the 20px thumb to ≈42px, overflowing the 40px container.

**Fix:**
- Add `p-0` to the button element to zero out browser padding
- Add `left-0.5` to the thumb span for an explicit 2px base position
- Change the "on" translate to `translate-x-[18px]` so the thumb lands at 20px from left, right edge at 40px (flush)
- Apply the same fix to both toggles (notifLikes and notifPosts)

---

## Bug Fix: Settings Background from Sidebar

**File:** `src/App.tsx`

**Root cause:** When Settings is opened via the SideDrawer, App.tsx renders:
```tsx
<div className="fixed inset-0 z-50 sm:bg-black/40 sm:flex sm:items-center sm:justify-center">
  <SettingsScreen ... />
</div>
```
`SettingsScreen` has `bg-transparent` because it was designed to render inside ProfileScreen's gradient wrapper. When opened directly from the sidebar, there is no gradient wrapper, leaving the screen transparent.

**Fix:** In App.tsx, wrap `<SettingsScreen>` in the same gradient container used by ProfileScreen:
```tsx
<div className="w-full h-full sm:w-[390px] sm:h-[844px] bg-gradient-to-b from-[#F5EDE0] via-[#EAD8C8] to-[#D9C4AF] sm:rounded-[44px] sm:shadow-2xl overflow-hidden flex flex-col">
  <SettingsScreen ... />
</div>
```

---

## Bug Fix: Camera Interaction in ComposerBar

**Files:** `src/components/comunidade/ComposerBar.tsx`, `src/components/comunidade/CreatePostScreen.tsx`, `src/components/comunidade/ComunidadeScreen.tsx`

**Root cause:** The Camera icon in ComposerBar is decorative — clicking it opens CreatePostScreen (same as clicking text), but users expect a camera tap to immediately trigger the image picker.

**Fix:**
- Add `onOpenWithImage?: () => void` prop to `ComposerBar`
- Make the Camera icon a separate `<button>` with `e.stopPropagation()` that calls `onOpenWithImage`
- Add `autoOpenImage?: boolean` prop to `CreatePostScreen`; on mount, if `autoOpenImage` is true, fire `fileInputRef.current?.click()` via `useEffect`
- In `ComunidadeScreen`, add `showCreateWithImage: boolean` state; pass `onOpenWithImage={() => setShowCreateWithImage(true)}` to ComposerBar; pass `autoOpenImage={showCreateWithImage}` to CreatePostScreen; reset on close

---

## Bug Fix: Profile Visitor Toggle Removal

**File:** `src/components/profile/ProfileScreen.tsx`

**Root cause:** The toggle "Meu perfil / Como visitante" has no functional purpose at this stage — the profile screen always shows the current user's own profile, so the visitor view (Follow/Message buttons) is confusing and misleading.

**Fix:** Remove `isVisitorView` state, `following` state, and the toggle UI. Always render the owner view (Editar perfil button). Remove the `isVisitorView` conditional block.

The "Editar perfil" button remains as a stub (no action yet — that's scoped to the separate Profile plan).

---

## Bug Fix: Like State Persistence

**Files:** `server/src/routes/posts.ts`, `src/lib/types.ts`, `src/lib/helpers.ts`, `src/components/comunidade/ComunidadeScreen.tsx`

**Root cause:** `PostCard` uses `const [liked, setLiked] = useState(false)` — local component state that resets to `false` on every unmount. When the user navigates away (to PostDetailScreen or back from Profile) and returns, the like state is lost.

**Fix:**

Backend — update `GET /posts` to include `likedByCurrentUser`:
```ts
include: {
  author: { select: { id: true, name: true } },
  _count: { select: { likes: true, comments: true } },
  likes: { where: { userId: request.userId }, select: { userId: true } },
},
```
Then map the result before sending: add `likedByCurrentUser: post.likes.length > 0` and remove the `likes` array from the response.

Frontend:
- Add `likedByCurrentUser: boolean` to `ApiPost` in `src/lib/types.ts`
- Update `apiPostToCommunityPost` in `src/lib/helpers.ts` to pass `likedByCurrentUser` through to `CommunityPost`
- Add `likedByCurrentUser: boolean` to the `CommunityPost` type in `src/types.ts`
- In `PostCard`, initialize liked state from `post.likedByCurrentUser` (use `useState(post.likedByCurrentUser ?? false)`)
- On like mutation success, update the query cache with `queryClient.setQueryData` for optimistic-style persistence without a full refetch

---

## Files Changed

| File | Change |
|------|--------|
| `src/components/auth/LoginScreen.tsx` | Add "Criar conta" button |
| `src/components/auth/RegisterScreen.tsx` | New — 2-step registration form |
| `src/components/profile/SettingsScreen.tsx` | Fix toggle CSS (p-0, left-0.5, translate-x-[18px]) |
| `src/App.tsx` | Wrap Settings overlay with gradient background |
| `src/components/comunidade/ComposerBar.tsx` | Add onOpenWithImage prop + separate camera button |
| `src/components/comunidade/CreatePostScreen.tsx` | Add autoOpenImage prop |
| `src/components/comunidade/ComunidadeScreen.tsx` | Add showCreateWithImage state |
| `src/components/profile/ProfileScreen.tsx` | Remove visitor toggle |
| `server/src/routes/auth.ts` | Add babyName to register; return full user on register |
| `server/src/routes/posts.ts` | Add likedByCurrentUser to GET /posts |
| `src/lib/types.ts` | Add likedByCurrentUser to ApiPost |
| `src/lib/helpers.ts` | Pass likedByCurrentUser in apiPostToCommunityPost |
| `src/types.ts` | Add likedByCurrentUser to CommunityPost |
