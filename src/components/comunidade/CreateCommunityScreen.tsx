import { useState, type FormEvent } from 'react';
import { ChevronLeft } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';

type Category = 'gestação' | 'pós-parto' | 'amamentação' | 'saúde mental';
type ColorKey = 'gold' | 'terracotta' | 'warm' | 'linen' | 'cream';

const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'gestação',     label: 'Gestação' },
  { value: 'pós-parto',    label: 'Pós-parto' },
  { value: 'amamentação',  label: 'Amamentação' },
  { value: 'saúde mental', label: 'Saúde Mental' },
];

const COLORS: { value: ColorKey; className: string }[] = [
  { value: 'gold',       className: 'bg-sara-gold' },
  { value: 'terracotta', className: 'bg-sara-terracotta' },
  { value: 'warm',       className: 'bg-sara-warm' },
  { value: 'linen',      className: 'bg-sara-linen' },
  { value: 'cream',      className: 'bg-sara-cream' },
];

interface CreateCommunityScreenProps {
  onCreated: (id: string) => void;
  onBack: () => void;
}

export function CreateCommunityScreen({ onCreated, onBack }: CreateCommunityScreenProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Category>('gestação');
  const [colorKey, setColorKey] = useState<ColorKey>('gold');
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      apiFetch<{ id: string }>('/communities', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim(), description: description.trim(), category, colorKey }),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['communities'] });
      onCreated(data.id);
    },
  });

  const valid = name.trim().length > 0 && description.trim().length > 0;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (valid) mutate();
  }

  return (
    <div className="flex flex-col w-full h-full sm:w-[390px] sm:h-[844px] bg-gradient-to-b from-[#F5EDE0] via-[#EAD8C8] to-[#D9C4AF] sm:rounded-[44px] sm:shadow-2xl overflow-hidden">
      <div className="flex items-center gap-3 px-4 pt-6 pb-3 flex-shrink-0">
        <button type="button" onClick={onBack} aria-label="Voltar" className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-sara-linen">
          <ChevronLeft size={20} className="text-graphite" />
        </button>
        <h1 className="text-base font-semibold text-graphite">Nova comunidade</h1>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-4 pb-4 flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="cc-name" className="text-xs font-medium text-graphite-muted">Nome</label>
          <input
            id="cc-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Gestantes de 2027"
            className="w-full px-4 py-3 rounded-2xl bg-white border border-sara-linen text-sm text-graphite focus:outline-none focus:border-sara-gold"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="cc-description" className="text-xs font-medium text-graphite-muted">Descrição</label>
          <textarea
            id="cc-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Para quem é essa comunidade?"
            className="w-full px-4 py-3 rounded-2xl bg-white border border-sara-linen text-sm text-graphite resize-none focus:outline-none focus:border-sara-gold"
          />
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-graphite-muted">Categoria</p>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setCategory(c.value)}
                aria-pressed={category === c.value}
                className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                  category === c.value ? 'bg-sara-gold text-white' : 'bg-white text-graphite-muted border border-sara-linen'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-graphite-muted">Cor</p>
          <div className="flex gap-2">
            {COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setColorKey(c.value)}
                aria-label={c.value}
                aria-pressed={colorKey === c.value}
                className={`w-10 h-10 rounded-full ${c.className} ${colorKey === c.value ? 'ring-2 ring-graphite ring-offset-2' : ''}`}
              />
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={!valid || isPending}
          className="w-full py-3 rounded-2xl bg-sara-gold text-white text-sm font-semibold active:scale-95 transition-transform disabled:opacity-50 mt-2"
        >
          {isPending ? 'Criando…' : 'Criar comunidade'}
        </button>
      </form>
    </div>
  );
}
