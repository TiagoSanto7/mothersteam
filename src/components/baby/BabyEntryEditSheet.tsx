import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import { TimeField } from '../home/QuickRegisterSheet';
import type { ApiBabyEntry } from '../../lib/types';
import type { BabyEntryChanges } from './useBabyDayEntries';

type Side = 'Esquerdo' | 'Direito';
type DiaperKind = 'Xixi' | 'Coco' | 'Ambos';

const TITLE: Record<ApiBabyEntry['type'], string> = {
  feed: 'Editar amamentação',
  sleep: 'Editar soneca',
  diaper: 'Editar fralda',
};

const DIAPER_OPTIONS: { key: DiaperKind; label: string; emoji: string }[] = [
  { key: 'Xixi', label: 'Xixi', emoji: '💧' },
  { key: 'Coco', label: 'Cocô', emoji: '💩' },
  { key: 'Ambos', label: 'Ambos', emoji: '🌊' },
];

// Details come in more than one format (older cards wrote "Mamou — seio esquerdo" / "Fralda trocada").
function parseSide(detail: string): Side | null {
  if (/esquerd/i.test(detail)) return 'Esquerdo';
  if (/direit/i.test(detail)) return 'Direito';
  return null;
}

function parseSleepMinutes(detail: string): number {
  const match = detail.match(/(\d+)\s*min/);
  return match ? parseInt(match[1], 10) : 0;
}

function parseDiaper(detail: string): DiaperKind | null {
  return DIAPER_OPTIONS.find((o) => o.key === detail)?.key ?? null;
}

/** Same local day as the original entry, at the edited HH:MM. */
function createdAtWithTime(originalIso: string, time: string): string {
  const d = new Date(originalIso);
  const [h, m] = time.split(':').map(Number);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

interface BabyEntryEditSheetProps {
  entry: ApiBabyEntry | null;
  onClose: () => void;
  /** Called on save; the sheet closes right away (the caller updates the list optimistically). */
  onSave: (id: string, changes: BabyEntryChanges) => void;
  onDelete: (id: string) => void;
}

export function BabyEntryEditSheet({ entry, onClose, onSave, onDelete }: BabyEntryEditSheetProps) {
  useEffect(() => {
    if (!entry) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [entry, onClose]);

  // Portal to body: the tab container animates with transforms, which would trap a fixed sheet.
  return createPortal(
    <AnimatePresence>
      {entry && (
        <>
          <motion.div
            data-testid="edit-sheet-backdrop"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={TITLE[entry.type]}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 34, mass: 0.9 }}
            className="fixed left-0 right-0 z-50 bg-white rounded-t-mt-lg shadow-mt-lg"
            style={{
              bottom: 'var(--keyboard-height, 0px)',
              paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)',
            }}
          >
            <div className="mx-auto w-12 h-1.5 bg-mt-linen rounded-full mt-3 mb-3" />
            {/* key remounts the form so its state always starts from the tapped entry */}
            <EditForm key={entry.id} entry={entry} onDone={onClose} onSave={onSave} onDelete={onDelete} />
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}

interface EditFormProps {
  entry: ApiBabyEntry;
  onDone: () => void;
  onSave: (id: string, changes: BabyEntryChanges) => void;
  onDelete: (id: string) => void;
}

function EditForm({ entry, onDone, onSave, onDelete }: EditFormProps) {
  const initialMinutes = parseSleepMinutes(entry.detail);

  const [time, setTime] = useState(entry.time);
  const [side, setSide] = useState<Side | null>(parseSide(entry.detail));
  const [hours, setHours] = useState(String(Math.floor(initialMinutes / 60)));
  const [minutes, setMinutes] = useState(String(initialMinutes % 60));
  const [diaper, setDiaper] = useState<DiaperKind | null>(parseDiaper(entry.detail));
  const [confirmDelete, setConfirmDelete] = useState(false);

  const totalMinutes = (parseInt(hours || '0', 10) || 0) * 60 + (parseInt(minutes || '0', 10) || 0);

  // Only rewrite the detail when the user actually changed it, so untouched legacy strings stay as-is.
  function nextDetail(): string | null {
    if (entry.type === 'feed') return side !== parseSide(entry.detail) ? side : null;
    if (entry.type === 'sleep') {
      return totalMinutes > 0 && totalMinutes !== initialMinutes ? `Dormiu por ${totalMinutes} min` : null;
    }
    return diaper !== parseDiaper(entry.detail) ? diaper : null;
  }

  const detail = nextDetail();
  const timeValid = /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
  const changes: BabyEntryChanges = {};
  if (timeValid && time !== entry.time) {
    changes.time = time;
    changes.createdAt = createdAtWithTime(entry.createdAt, time);
  }
  if (detail && detail !== entry.detail) changes.detail = detail;
  const canSave = timeValid && Object.keys(changes).length > 0 && (entry.type !== 'sleep' || totalMinutes > 0);

  const save = () => {
    onSave(entry.id, changes);
    onDone();
  };

  const remove = () => {
    onDelete(entry.id);
    onDone();
  };

  const bump = (field: 'h' | 'm', dir: 1 | -1) => {
    if (field === 'h') setHours(String(Math.max(0, Math.min(23, (parseInt(hours || '0', 10) || 0) + dir))));
    else setMinutes(String(Math.max(0, Math.min(59, (parseInt(minutes || '0', 10) || 0) + dir))));
  };

  return (
    <div className="px-5 pb-2 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold font-serif text-mt-charcoal">{TITLE[entry.type]}</h2>
        <label className="flex items-center gap-2 text-[11px] font-semibold text-mt-muted uppercase tracking-wide">
          Horário
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            aria-label="Horário"
            className="h-9 px-3 rounded-mt-pill bg-mt-linen/60 text-[14px] font-semibold text-mt-charcoal normal-case tabular-nums focus:outline-none focus:ring-2 focus:ring-mt-rose"
          />
        </label>
      </div>

      {entry.type === 'feed' && (
        <div className="flex gap-2">
          {(['Esquerdo', 'Direito'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSide(s)}
              aria-pressed={side === s}
              className={`flex-1 py-3 rounded-mt-pill text-[13px] font-semibold transition-colors ${
                side === s ? 'bg-mt-rose text-white shadow-mt' : 'bg-mt-linen text-mt-muted'
              }`}
            >
              {s === 'Esquerdo' ? '← Esquerdo' : 'Direito →'}
            </button>
          ))}
        </div>
      )}

      {entry.type === 'sleep' && (
        <div className="flex items-center justify-center gap-2">
          <TimeField value={hours} onChange={setHours} onBump={(d) => bump('h', d)} max={23} label="h" />
          <span className="text-3xl font-bold text-mt-muted pb-6">:</span>
          <TimeField value={minutes} onChange={setMinutes} onBump={(d) => bump('m', d)} max={59} label="min" />
        </div>
      )}

      {entry.type === 'diaper' && (
        <div className="grid grid-cols-3 gap-2">
          {DIAPER_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setDiaper(opt.key)}
              aria-pressed={diaper === opt.key}
              className={`flex flex-col items-center gap-1.5 py-3 rounded-mt transition-colors ${
                diaper === opt.key ? 'bg-mt-rose text-white shadow-mt' : 'bg-mt-linen text-mt-charcoal'
              }`}
            >
              <span className="text-2xl leading-none">{opt.emoji}</span>
              <span className="text-[13px] font-semibold">{opt.label}</span>
            </button>
          ))}
        </div>
      )}

      {confirmDelete ? (
        <div className="flex flex-col gap-2">
          <p className="text-[13px] text-mt-charcoal text-center">Excluir este registro? Não dá para desfazer.</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="flex-1 py-3 rounded-mt-pill bg-mt-linen text-mt-muted text-[14px] font-semibold"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={remove}
              className="flex-1 py-3 rounded-mt-pill bg-mt-rose-dark text-white text-[14px] font-bold"
            >
              Sim, excluir
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            aria-label="Excluir registro"
            className="w-12 h-12 flex-shrink-0 rounded-full bg-mt-linen text-mt-rose-dark flex items-center justify-center"
          >
            <Trash2 size={18} strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={save}
            disabled={!canSave}
            className="flex-1 py-3 rounded-mt-pill bg-mt-gradient text-white text-[14px] font-bold shadow-mt disabled:opacity-40"
          >
            Salvar alterações
          </button>
        </div>
      )}

    </div>
  );
}
