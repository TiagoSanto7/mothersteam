# Bluesky Composer + Nav Redesign — Design Spec

**Date:** 2026-07-06

---

## Goal

Transform the Mothers Team app so the community feed becomes the primary home experience, add a Bluesky-style composer bar + FAB for creating posts, and support image attachments in posts.

---

## Context

The app currently has five bottom nav tabs: Home, MãeIA, Bebê, Comunidade, Shopping. The Community feed lives in the Comunidade tab and has a "Desabafar 💜" button in its header as the only entry point to create posts. This redesign:

1. Fuses Home and Comunidade — the feed IS the home screen.
2. Moves the old Home content (saudação + calendário + rotina do dia) to a new Rotina tab.
3. Adds two new entry points for post creation: ComposerBar (inline, top of feed) and FAB (floating).
4. Adds image attachment support to posts.

---

## Design Decisions

| Question | Answer |
|---|---|
| Nav structure | Option C — `home` tab renders ComunidadeScreen; new `rotina` tab renders current HomeScreen |
| Old HomeScreen content | Becomes full "Rotina" tab (saudação + calendário + rotina do dia) |
| Desabafar header button | Removed — ComposerBar + FAB replace it completely |
| PostCard image layout | Option A — image below text, full width |

---

## Section 1 — Types and Navigation

### `src/types/index.ts`

- Add `'rotina'` to `TabId` union.
- Keep `'comunidade'` in `TabId` (backwards compat with persisted localStorage state — any user with `activeTab: 'comunidade'` in storage will be silently redirected to ComunidadeScreen in App.tsx).
- Add `imageUrl?: string` to `CommunityPost`.

```ts
export type TabId = 'home' | 'maeIA' | 'baby' | 'rotina' | 'comunidade' | 'shopping';

export interface CommunityPost {
  // ... existing fields ...
  imageUrl?: string;
}
```

### `src/App.tsx`

Route `activeTab` to screens:

```tsx
'home'       → <ComunidadeScreen />
'rotina'     → <HomeScreen />
'comunidade' → <ComunidadeScreen />   // alias for stale persisted state
// maeIA, baby, shopping unchanged
```

### `src/components/layout/BottomTabBar.tsx`

Replace the Comunidade tab (💬) with Rotina (📅) at position 4.

Final tab order:
1. 🏠 Home (`home`)
2. 🤖 MãeIA (`maeIA`)
3. 👶 Bebê (`baby`)
4. 📅 Rotina (`rotina`)
5. 🛍️ Shopping (`shopping`)

---

## Section 2 — ComposerBar

### `src/components/comunidade/ComposerBar.tsx` (new file)

**Props:** `onOpen: () => void`

**Layout:** full-width flex row, glassmorphism card, tapping anywhere calls `onOpen`.

```
┌──────────────────────────────────────────────┐
│ [M]  O que você está sentindo hoje?      📷  │
└──────────────────────────────────────────────┘
```

**Styling:**
- Container: `bg-white/70 backdrop-blur-sm border border-white/50 rounded-2xl p-3 mx-4 mb-3 flex items-center gap-3 cursor-pointer`
- Avatar: `w-8 h-8 rounded-full bg-sara-terracotta text-white text-sm font-bold flex items-center justify-center` — initial from `motherProfile?.name[0] ?? 'M'`
- Placeholder: `flex-1 text-graphite-muted text-sm` — "O que você está sentindo hoje?"
- Icon: Lucide `Camera`, `w-5 h-5 text-sara-gold`

**Placement in ComunidadeScreen:** renders between the top tab bar and the category filter chips, only when `topTab === 'para-voce'`.

**Side effect:** The "Desabafar 💜" button is removed from the ComunidadeScreen header in this same task.

---

## Section 3 — FAB

**Location:** inline `motion.button` inside `ComunidadeScreen.tsx`, not a separate component.

**Visibility:** only when `topTab === 'para-voce'`.

**Position:** `fixed bottom-24 right-4 z-20`

**Appearance:** `w-14 h-14 rounded-full bg-sara-gold text-white shadow-lg flex items-center justify-center`

**Icon:** Lucide `Plus`, `w-6 h-6`

**Animation:**
```tsx
<motion.button
  initial={{ scale: 0, opacity: 0 }}
  animate={{ scale: 1, opacity: 1 }}
  whileTap={{ scale: 0.92 }}
  transition={{ type: 'spring', duration: 0.3 }}
  onClick={openCreatePost}
  className="fixed bottom-24 right-4 z-20 w-14 h-14 rounded-full bg-sara-gold text-white shadow-lg flex items-center justify-center"
  aria-label="Criar post"
>
  <Plus className="w-6 h-6" />
</motion.button>
```

**Behavior:** same `openCreatePost` callback as ComposerBar — opens CreatePostScreen.

---

## Section 4 — CreatePostScreen with Image

**`src/components/comunidade/CreatePostScreen.tsx`** — rewrite to add image support.

### New local state

```ts
const [imagePreview, setImagePreview] = useState<string | null>(null);
const fileInputRef = useRef<HTMLInputElement>(null);
```

### Image selection

Hidden file input triggered by an "Adicionar foto" button:

```tsx
<input
  ref={fileInputRef}
  type="file"
  accept="image/*"
  className="hidden"
  onChange={(e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  }}
/>
<button onClick={() => fileInputRef.current?.click()}>
  <ImagePlus className="w-5 h-5" /> Adicionar foto
</button>
```

### Image preview

When `imagePreview` is set, show below the textarea:

```tsx
{imagePreview && (
  <div className="relative mt-2">
    <img src={imagePreview} className="w-full rounded-xl object-cover max-h-48" alt="Preview" />
    <button
      onClick={() => setImagePreview(null)}
      className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1"
      aria-label="Remover imagem"
    >
      <X className="w-4 h-4" />
    </button>
  </div>
)}
```

### Submit

```ts
addCommunityPost({
  text,
  imageUrl: imagePreview ?? undefined,
  // ... other existing fields
});
setImagePreview(null); // reset after submit
```

**Constraint:** one image per post. No multiple file selection.

---

## Section 5 — PostCard Image Rendering

**Location:** inside the PostCard render in `ComunidadeScreen.tsx`.

When `post.imageUrl` is set, render below the post text and above the reaction bar:

```tsx
{post.imageUrl && (
  <img
    src={post.imageUrl}
    alt="Imagem do post"
    className="w-full rounded-xl object-cover max-h-64 mt-2"
  />
)}
```

No lazy loading, no lightbox. Base64 data URL is already in memory.

---

## Files Touched

| File | Action |
|---|---|
| `src/types/index.ts` | Modify — add `'rotina'` to TabId, add `imageUrl?` to CommunityPost |
| `src/App.tsx` | Modify — route `home`/`comunidade` → ComunidadeScreen, `rotina` → HomeScreen |
| `src/components/layout/BottomTabBar.tsx` | Modify — replace Comunidade tab with Rotina tab |
| `src/components/comunidade/ComposerBar.tsx` | Create — new component |
| `src/components/comunidade/ComunidadeScreen.tsx` | Modify — add ComposerBar, FAB, remove Desabafar button, add image to PostCard |
| `src/components/comunidade/CreatePostScreen.tsx` | Rewrite — add FileReader image support |

---

## Out of Scope

- Multiple images per post
- Image compression or resizing before storage
- Lightbox / full-screen image view
- Lazy loading
- Any backend or persistence changes (images stored as base64 data URLs in Zustand — they will be persisted to localStorage by the existing `persist` middleware; acceptable for demo scope, but would need a proper upload API in production)

---

## Testing

Each task produces tests covering:
- New TabId routing (home → feed, rotina → HomeScreen)
- ComposerBar renders avatar initial + placeholder + calls onOpen on tap
- FAB renders only on para-voce tab, calls openCreatePost
- CreatePostScreen: file input triggers FileReader, preview shows, X removes it, submit passes imageUrl
- PostCard: renders img when imageUrl present, renders nothing when absent
