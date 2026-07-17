export interface MensagemDeDeus {
  versiculo: string;
  referencia: string;
  mensagem: string;
}

type FaseUsuaria =
  | 'trimester1'
  | 'trimester2'
  | 'trimester3'
  | 'postpartum_0_30'
  | 'postpartum_31_180'
  | 'postpartum_181_365'
  | 'adolescente'
  | 'default';

export const mensagensDeDeus: Record<FaseUsuaria, MensagemDeDeus> = {
  trimester1: {
    versiculo: "Antes de te formar no ventre materno, eu te conheci; antes de nasceres, eu te consagrei.",
    referencia: "Jeremias 1:5",
    mensagem: "Algo sagrado começa aqui. Deus já conhece esse bebê pelo nome — e ele conhece você, mamãe. Você não está só nesse início.",
  },
  trimester2: {
    versiculo: "Ele te deu força como a de um guerreiro. Levanta-te e age, não te atemorizes.",
    referencia: "1 Crônicas 28:20",
    mensagem: "Seu bebê cresce, e você também. A cada semana que passa, você se torna mais da mãe que sempre foi chamada a ser.",
  },
  trimester3: {
    versiculo: "Serei com ela na angústia; livrarei-a e a glorificarei.",
    referencia: "Salmos 91:15",
    mensagem: "O momento mais esperado está próximo. Deus estará com você a cada contração, a cada respiração. Coragem — você foi feita para isso.",
  },
  postpartum_0_30: {
    versiculo: "Ele dá forças ao cansado e vigor ao que não tem nenhum.",
    referencia: "Isaías 40:29",
    mensagem: "Acordar de madrugada, dar de mamar, cuidar com o corpo exausto — isso é um ato de amor sagrado. Deus vê cada vez que você se levanta. Você não está invisível.",
  },
  postpartum_31_180: {
    versiculo: "O SENHOR te sustentará num leito de enfermidade; em tua doença, tu o recuperarás.",
    referencia: "Salmos 41:3",
    mensagem: "Você já passou pelo mais difícil e nem percebeu. Cada dia foi uma vitória pequena e real. Deus está restaurando suas forças enquanto você cuida.",
  },
  postpartum_181_365: {
    versiculo: "Aquele que começou boa obra em você a completará até o dia de Cristo Jesus.",
    referencia: "Filipenses 1:6",
    mensagem: "Você já é uma mãe experiente — talvez sem sentir, mas é. Deus continua sua obra em você e no seu filho. O melhor ainda está por vir.",
  },
  adolescente: {
    versiculo: "Não diga: 'Sou muito jovem.' Pois a todos a quem eu te enviar irás.",
    referencia: "Jeremias 1:7",
    mensagem: "Deus não errou ao escolher você para ser a mãe desse bebê. Você é mais forte do que imagina. Aqui você é acolhida, nunca julgada.",
  },
  default: {
    versiculo: "Tudo posso naquele que me fortalece.",
    referencia: "Filipenses 4:13",
    mensagem: "Seja bem-vinda ao Mother's Team. Você não precisa percorrer essa jornada sozinha. Estamos aqui com você.",
  },
};

export function getMensagemParaFase(
  pregnancyStage: 'pregnant' | 'postpartum',
  semanaOuDias: number,
  motherAgeInYears?: number,
): MensagemDeDeus {
  if (motherAgeInYears !== undefined && motherAgeInYears < 18) {
    return mensagensDeDeus.adolescente;
  }
  if (pregnancyStage === 'pregnant') {
    if (semanaOuDias <= 13) return mensagensDeDeus.trimester1;
    if (semanaOuDias <= 27) return mensagensDeDeus.trimester2;
    return mensagensDeDeus.trimester3;
  }
  // postpartum — semanaOuDias = baby age in days
  if (semanaOuDias <= 30) return mensagensDeDeus.postpartum_0_30;
  if (semanaOuDias <= 180) return mensagensDeDeus.postpartum_31_180;
  if (semanaOuDias <= 365) return mensagensDeDeus.postpartum_181_365;
  return mensagensDeDeus.default;
}
