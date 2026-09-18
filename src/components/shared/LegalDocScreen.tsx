import { ChevronLeft } from 'lucide-react';

export type LegalDoc = 'termos' | 'privacidade';

const DOC_PATHS: Record<LegalDoc, string> = {
  termos: '/termos.html',
  privacidade: '/privacidade.html',
};

const DOC_TITLES: Record<LegalDoc, string> = {
  termos: 'Termos de Uso',
  privacidade: 'Política de Privacidade',
};

interface LegalDocScreenProps {
  doc: LegalDoc;
  onBack: () => void;
}

/**
 * Exibe termos.html/privacidade.html num iframe local, dentro do próprio app
 * (TIA-49) — nunca abre em nova aba/janela, então não tem como perder o
 * estado da tela de origem nem travar em cliques repetidos.
 */
export function LegalDocScreen({ doc, onBack }: LegalDocScreenProps) {
  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4 border-b border-mt-linen/60 flex-shrink-0">
        <button
          type="button"
          onClick={onBack}
          aria-label="Voltar"
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-mt-linen"
        >
          <ChevronLeft size={20} className="text-mt-charcoal" />
        </button>
        <h1 className="text-base font-semibold text-mt-charcoal">{DOC_TITLES[doc]}</h1>
      </div>
      <iframe src={DOC_PATHS[doc]} title={DOC_TITLES[doc]} className="flex-1 w-full border-0" />
    </div>
  );
}
