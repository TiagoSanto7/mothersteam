interface Props {
  text: string;
  onMentionPress?: (username: string) => void;
  className?: string;
}

/** Renders text, turning @username tokens into tappable spans. */
export function MentionText({ text, onMentionPress, className }: Props) {
  const parts = text.split(/(@[a-z0-9_]+)/gi);

  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (/^@[a-z0-9_]+$/i.test(part) && onMentionPress) {
          const username = part.slice(1);
          return (
            <button
              key={i}
              type="button"
              onClick={(e) => { e.stopPropagation(); onMentionPress(username); }}
              className="text-sara-gold font-medium hover:underline"
            >
              {part}
            </button>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}
