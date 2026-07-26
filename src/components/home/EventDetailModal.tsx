import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Calendar, Clock, Tag, Trash2, Pencil, ArrowRight } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import { useAppStore } from '../../store/useAppStore';
import { formatDateFull } from '../../lib/dateUtils';
import type { ApiRoutineEntry } from '../../lib/types';
import { AddRoutineModal } from './AddRoutineModal';
import type { RoutineEntry } from '../../types';

const CATEGORY_LABELS: Record<ApiRoutineEntry['category'], string> = {
  task: '✅ Tarefa',
  appointment: '📅 Consulta',
  medication: '💊 Medicação',
};

interface EventDetailModalProps {
  entry: ApiRoutineEntry;
  onClose: () => void;
}

export function EventDetailModal({ entry, onClose }: EventDetailModalProps) {
  const [showEditModal, setShowEditModal]       = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const queryClient  = useQueryClient();
  const setSelectedDate = useAppStore((s) => s.setSelectedDate);

  const { mutate: deleteEntry, isPending: isDeleting } = useMutation({
    mutationFn: () => apiFetch(`/routine/${entry.id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routine'] });
      queryClient.invalidateQueries({ queryKey: ['routine', 'future'] });
      onClose();
    },
  });

  function goToDate() {
    setSelectedDate(entry.date);
    onClose();
  }

  if (showEditModal) {
    const editRoutineEntry: RoutineEntry = {
      id: entry.id,
      time: entry.time,
      date: entry.date,
      title: entry.title,
      category: entry.category,
      done: entry.done,
      notes: entry.notes,
    };
    return (
      <AddRoutineModal
        onClose={() => { setShowEditModal(false); onClose(); }}
        defaultDate={entry.date}
        editEntry={editRoutineEntry}
      />
    );
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
        onClick={onClose}
        aria-hidden="true"
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={`Detalhe: ${entry.title}`}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 24 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="fixed bottom-0 left-0 right-0 mx-auto max-w-[390px] w-full bg-sara-linen/95 backdrop-blur-md rounded-t-[32px] z-50 px-6 pt-5 pb-10 flex flex-col gap-4 shadow-2xl overflow-y-auto max-h-[90vh]"
      >
        {/* Handle + close */}
        <div className="flex items-center justify-between">
          <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto absolute left-1/2 -translate-x-1/2 top-3" />
          <h2 className="text-base font-semibold font-serif text-graphite pt-2 flex-1 truncate pr-8">
            {entry.title}
          </h2>
          <button onClick={onClose} aria-label="Fechar" className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
            <X size={14} className="text-graphite-muted" strokeWidth={2} />
          </button>
        </div>

        {/* Meta info */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-sm text-graphite-muted">
            <Calendar size={15} className="flex-shrink-0" />
            <span>{formatDateFull(entry.date)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-graphite-muted">
            <Clock size={15} className="flex-shrink-0" />
            <span>{entry.time}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-graphite-muted">
            <Tag size={15} className="flex-shrink-0" />
            <span>{CATEGORY_LABELS[entry.category]}</span>
          </div>
        </div>

        {/* Notes */}
        {entry.notes && (
          <div className="bg-white rounded-2xl p-4 border border-sara-linen">
            <p className="text-xs font-medium text-graphite-muted mb-1">Observação</p>
            <p className="text-sm text-graphite leading-relaxed whitespace-pre-wrap">{entry.notes}</p>
          </div>
        )}

        {/* Go to date */}
        <button
          onClick={goToDate}
          className="flex items-center gap-1 text-xs text-sara-gold font-medium self-start"
        >
          ir para a data <ArrowRight size={13} />
        </button>

        {/* Delete confirm */}
        {showDeleteConfirm ? (
          <div className="flex flex-col gap-2 bg-white rounded-2xl p-4 border border-red-100">
            <p className="text-sm font-medium text-graphite">Excluir este evento?</p>
            <p className="text-xs text-graphite-muted">Esta ação não pode ser desfeita.</p>
            <div className="flex gap-2 mt-1">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2 rounded-xl border border-sara-linen text-sm text-graphite-muted"
              >
                Cancelar
              </button>
              <button
                onClick={() => deleteEntry()}
                disabled={isDeleting}
                className="flex-1 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold disabled:opacity-50"
              >
                {isDeleting ? 'Excluindo…' : 'Excluir'}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-3">
            <button
              onClick={() => setShowEditModal(true)}
              aria-label="Editar evento"
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-sara-gold text-sara-gold text-sm font-semibold"
            >
              <Pencil size={15} />
              Editar
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              aria-label="Excluir evento"
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-red-200 text-red-500 text-sm font-semibold"
            >
              <Trash2 size={15} />
              Excluir
            </button>
          </div>
        )}
      </motion.div>
    </>
  );
}
