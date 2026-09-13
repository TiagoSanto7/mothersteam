import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import { ptBR } from 'date-fns/locale';
import { format, parse, isValid } from 'date-fns';
import 'react-day-picker/style.css';

interface DateFieldProps {
  id?: string;
  value: string;
  onChange: (isoDate: string) => void;
  min?: string;
  max?: string;
}

const ISO = 'yyyy-MM-dd';
const DISPLAY = 'dd/MM/yyyy';

function toDate(iso: string): Date | undefined {
  if (!iso) return undefined;
  const d = parse(iso, ISO, new Date());
  return isValid(d) ? d : undefined;
}

export function DateField({ id, value, onChange, min, max }: DateFieldProps) {
  const [open, setOpen] = useState(false);
  const selected = toDate(value);
  const display = selected ? format(selected, DISPLAY) : '';

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const handleSelect = (d: Date | undefined) => {
    if (!d) return;
    onChange(format(d, ISO));
    setOpen(false);
  };

  return (
    <>
      <button
        id={id}
        type="button"
        onClick={() => setOpen(true)}
        className={`w-full h-[46px] px-3 rounded-2xl bg-white border border-mt-linen text-sm focus:outline-none focus:border-mt-rose text-center ${
          display ? 'text-mt-charcoal' : 'text-mt-muted'
        }`}
      >
        {display || 'Selecione'}
      </button>

      {open && createPortal(
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[100] bg-black/50 flex items-end sm:items-center justify-center"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 34 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:w-auto sm:max-w-md bg-mt-linen rounded-t-[32px] sm:rounded-[32px] px-4 pt-4 shadow-2xl"
              style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
            >
              <div className="flex items-center justify-between mb-2 px-2">
                <h3 className="text-base font-semibold font-serif text-mt-charcoal">
                  Selecionar data
                </h3>
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Fechar"
                  className="w-8 h-8 rounded-full bg-white flex items-center justify-center"
                >
                  <X size={14} className="text-mt-muted" strokeWidth={2} />
                </button>
              </div>
              <div className="flex justify-center">
                <DayPicker
                  mode="single"
                  selected={selected}
                  onSelect={handleSelect}
                  locale={ptBR}
                  showOutsideDays
                  disabled={[
                    ...(min ? [{ before: toDate(min)! }] : []),
                    ...(max ? [{ after: toDate(max)! }] : []),
                  ]}
                  classNames={{
                    root: 'mt-datepicker mx-auto',
                    month_caption: 'flex justify-center py-2 mb-2 font-serif text-mt-charcoal capitalize',
                    nav: 'flex items-center justify-between absolute inset-x-0 top-1 px-2',
                    button_previous: 'w-8 h-8 rounded-full bg-white flex items-center justify-center text-mt-muted',
                    button_next: 'w-8 h-8 rounded-full bg-white flex items-center justify-center text-mt-muted',
                    month_grid: 'w-full border-collapse',
                    weekdays: 'text-mt-muted',
                    weekday: 'text-xs font-medium py-2 text-center w-10',
                    day: 'text-center p-0 w-10',
                    day_button: 'w-10 h-10 rounded-full text-sm text-mt-charcoal hover:bg-white transition-colors',
                    selected: '[&_button]:bg-mt-rose [&_button]:text-white [&_button]:hover:bg-mt-rose-dark',
                    today: '[&_button]:font-bold [&_button]:text-mt-rose-dark',
                    outside: 'text-mt-muted/50',
                    disabled: 'opacity-30 pointer-events-none',
                  }}
                />
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}
