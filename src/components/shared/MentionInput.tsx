import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';

interface Props {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
  className?: string;
  'aria-label'?: string;
}

interface MentionCandidate {
  id: string;
  name: string;
  username?: string | null;
}

/** Detects the current @mention being typed (word starting with @ at cursor). */
function getActiveMention(text: string, cursor: number): string | null {
  const before = text.slice(0, cursor);
  const match = before.match(/@([a-z0-9_]*)$/i);
  return match ? match[1] : null;
}

export function MentionInput({ value, onChange, placeholder, rows = 3, maxLength, className, ...rest }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ['users', 'mention', mentionQuery],
    queryFn: () => apiFetch<{ items: MentionCandidate[] }>(`/users?q=${encodeURIComponent(mentionQuery ?? '')}&limit=6`),
    enabled: mentionQuery !== null && mentionQuery.length >= 1,
    staleTime: 10_000,
  });

  const suggestions = data?.items ?? [];

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value;
    onChange(val);
    const cursor = e.target.selectionStart ?? val.length;
    const active = getActiveMention(val, cursor);
    setMentionQuery(active);
  }

  function handleKeyUp(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    const el = e.currentTarget;
    const active = getActiveMention(el.value, el.selectionStart ?? el.value.length);
    setMentionQuery(active);
  }

  function applySuggestion(user: MentionCandidate) {
    const el = textareaRef.current;
    if (!el) return;
    const cursor = el.selectionStart ?? value.length;
    const before = value.slice(0, cursor);
    const after = value.slice(cursor);
    const replaced = before.replace(/@([a-z0-9_]*)$/i, `@${user.username ?? user.name} `);
    onChange(replaced + after);
    setMentionQuery(null);
    setTimeout(() => {
      el.focus();
      el.selectionStart = el.selectionEnd = replaced.length;
    }, 0);
  }

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (textareaRef.current && !textareaRef.current.parentElement?.contains(e.target as Node)) {
        setMentionQuery(null);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyUp={handleKeyUp}
        placeholder={placeholder}
        rows={rows}
        maxLength={maxLength}
        className={className}
        {...rest}
      />
      {mentionQuery !== null && suggestions.length > 0 && (
        <ul className="absolute bottom-full left-0 mb-1 w-full bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-50 max-h-48 overflow-y-auto">
          {suggestions.map((u) => (
            <li key={u.id}>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); applySuggestion(u); }}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-sara-linen text-left"
              >
                <span className="text-sm font-medium text-graphite">{u.name}</span>
                {u.username && (
                  <span className="text-xs text-graphite-muted">@{u.username}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
