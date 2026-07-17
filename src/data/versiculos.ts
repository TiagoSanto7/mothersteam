export interface Versiculo {
  texto: string;
  referencia: string;
}

type TabVersiculos = 'home' | 'maeIA' | 'baby' | 'rotina' | 'shopping';

const versiculos: Record<TabVersiculos, Versiculo[]> = {
  home: [
    { texto: "Tudo posso naquele que me fortalece.", referencia: "Filipenses 4:13" },
    { texto: "Sabemos que todas as coisas cooperam para o bem daqueles que amam a Deus.", referencia: "Romanos 8:28" },
    { texto: "Não tenha medo, pois estou com você; não se apavore, pois sou o seu Deus.", referencia: "Isaías 41:10" },
    { texto: "Seja forte e corajoso! Não se apavore nem desanime, pois o SENHOR, o seu Deus, estará com você por onde você andar.", referencia: "Josué 1:9" },
    { texto: "Deus é o nosso refúgio e força, socorro bem-provado nas tribulações.", referencia: "Salmos 46:1" },
    { texto: "Lancem sobre ele toda a sua ansiedade, porque ele cuida de vocês.", referencia: "1 Pedro 5:7" },
    { texto: "Pois eu sei os planos que tenho para vocês, planos de fazê-los prosperar e não de causar dano, planos de dar a vocês esperança e um futuro.", referencia: "Jeremias 29:11" },
    { texto: "Venham a mim, todos os que estão cansados e sobrecarregados, e eu lhes darei descanso.", referencia: "Mateus 11:28" },
    { texto: "Os que esperam no SENHOR renovam as suas forças. Voam alto como águias.", referencia: "Isaías 40:31" },
    { texto: "O meu socorro vem do SENHOR, que fez os céus e a terra.", referencia: "Salmos 121:2" },
    { texto: "O SENHOR está perto dos que têm o coração quebrantado e salva os que estão com o espírito abatido.", referencia: "Salmos 34:18" },
    { texto: "Que o Deus da esperança os encha de toda alegria e paz, à medida que confiam nele.", referencia: "Romanos 15:13" },
    { texto: "O SENHOR é o meu pastor; nada me faltará.", referencia: "Salmos 23:1" },
    { texto: "As misericórdias do SENHOR jamais cessam; as suas compaixões nunca chegam ao fim. São renovadas cada manhã.", referencia: "Lamentações 3:22-23" },
  ],

  maeIA: [
    { texto: "Confie no SENHOR de todo o seu coração e não se apoie em seu próprio entendimento. Reconheça-o em todos os seus caminhos, e ele endireitará as suas veredas.", referencia: "Provérbios 3:5-6" },
    { texto: "Se algum de vocês tem falta de sabedoria, peça-a a Deus, que a todos dá livremente.", referencia: "Tiago 1:5" },
    { texto: "Quando você se desviar, seus ouvidos ouvirão uma voz: 'Este é o caminho; andem por ele'.", referencia: "Isaías 30:21" },
    { texto: "Eu o instruirei e lhe ensinarei o caminho que deve seguir; eu o aconselharei e cuidarei de você.", referencia: "Salmos 32:8" },
    { texto: "Pois o SENHOR concede sabedoria; do seu boca procedem conhecimento e discernimento.", referencia: "Provérbios 2:6" },
    { texto: "Ele guia os humildes na justiça e lhes ensina os seus caminhos.", referencia: "Salmos 25:9" },
    { texto: "O Espírito Santo os guiará em toda a verdade.", referencia: "João 16:13" },
    { texto: "Sou o SENHOR, o seu Deus, que lhe ensina o que é para o seu bem, que a conduz pelo caminho que deve seguir.", referencia: "Isaías 48:17" },
    { texto: "Lâmpada para os meus pés é a tua palavra, e luz para o meu caminho.", referencia: "Salmos 119:105" },
    { texto: "O sábio ouça e cresça em sabedoria, e o entendido busque conselhos sábios.", referencia: "Provérbios 1:5" },
    { texto: "Louvarei ao SENHOR que me aconselha; mesmo de noite o meu coração me instrui.", referencia: "Salmos 16:7" },
    { texto: "O princípio da sabedoria é: busque a sabedoria; com tudo o que você tem, adquira discernimento.", referencia: "Provérbios 4:7" },
    { texto: "O SENHOR firma os passos do homem e se deleita no seu caminho.", referencia: "Salmos 37:23" },
    { texto: "Clama a mim e te responderei; dir-te-ei coisas grandes e ocultas que você não conhece.", referencia: "Jeremias 33:3" },
  ],

  baby: [
    { texto: "Os filhos são uma herança do SENHOR; o fruto do ventre é uma recompensa.", referencia: "Salmos 127:3" },
    { texto: "Instrua a criança no caminho em que deve andar, e mesmo quando envelhecer não se desviará dele.", referencia: "Provérbios 22:6" },
    { texto: "Deixem as crianças virem a mim; não as impeçam, pois o reino de Deus pertence aos que são como elas.", referencia: "Marcos 10:14" },
    { texto: "Tu formaste o meu ser interior; tu me teceste no ventre de minha mãe. Graças te dou porque fui feito de modo espantoso e maravilhoso.", referencia: "Salmos 139:13-14" },
    { texto: "Pode uma mãe esquecer seu filho de peito? Ainda que ela se esquecesse, eu não me esquecerei de você!", referencia: "Isaías 49:15" },
    { texto: "Não tenho maior alegria do que ouvir que meus filhos andam na verdade.", referencia: "3 João 1:4" },
    { texto: "Como um pai tem compaixão de seus filhos, assim o SENHOR tem compaixão dos que o temem.", referencia: "Salmos 103:13" },
    { texto: "Como mãe que consola o seu filho, assim eu os consolarei.", referencia: "Isaías 66:13" },
    { texto: "E quem recebe uma criança como esta em meu nome, a mim recebe.", referencia: "Mateus 18:5" },
    { texto: "Estes mandamentos devem estar gravados no seu coração. Repita-os aos seus filhos.", referencia: "Deuteronômio 6:6-7" },
    { texto: "O pai do justo rejubila-se muito; o que tem filho sábio se alegra com ele.", referencia: "Provérbios 23:24" },
    { texto: "Para você me voltei desde o nascimento; desde o ventre de minha mãe, tu és o meu Deus.", referencia: "Salmos 22:10" },
    { texto: "Os filhos de seus filhos são a coroa dos velhos.", referencia: "Provérbios 17:6" },
    { texto: "Pois eu derramo água sobre a terra sedenta e riachos sobre o solo seco; derramarei o meu Espírito sobre a sua descendência.", referencia: "Isaías 44:3" },
  ],

  rotina: [
    { texto: "Não nos cansemos de fazer o bem, pois, se não desanimar, ceifaremos no tempo oportuno.", referencia: "Gálatas 6:9" },
    { texto: "Tudo o que fizerem, façam de todo o coração, como se fosse para o Senhor, e não para os homens.", referencia: "Colossenses 3:23" },
    { texto: "Façam tudo para a glória de Deus.", referencia: "1 Coríntios 10:31" },
    { texto: "Somos criação de Deus, criados em Cristo Jesus para fazer boas obras.", referencia: "Efésios 2:10" },
    { texto: "Aprendi a estar satisfeito em qualquer situação em que me encontre.", referencia: "Filipenses 4:11" },
    { texto: "Entregue ao SENHOR o seu caminho; confie nele, e ele agirá.", referencia: "Salmos 37:5" },
    { texto: "Este é o dia que o SENHOR fez; alegremo-nos e nos regozijemos nele.", referencia: "Salmos 118:24" },
    { texto: "Tu guardarás em perfeita paz aquele cujo propósito está firme em ti, porque confia em ti.", referencia: "Isaías 26:3" },
    { texto: "E a paz de Deus, que excede todo o entendimento, guardará o coração e a mente de vocês em Cristo Jesus.", referencia: "Filipenses 4:7" },
    { texto: "Ensina-nos a contar os nossos dias, para que o nosso coração alcance sabedoria.", referencia: "Salmos 90:12" },
    { texto: "Jesus Cristo é o mesmo ontem, hoje e para sempre.", referencia: "Hebreus 13:8" },
    { texto: "O SENHOR abençoará a sua entrada e a sua saída, desde agora e para sempre.", referencia: "Salmos 121:8" },
    { texto: "Venha o teu reino, seja feita a tua vontade, assim na terra como no céu.", referencia: "Mateus 6:10" },
    { texto: "Não se preocupem com o amanhã, pois o amanhã cuidará de si mesmo. A cada dia basta o seu mal.", referencia: "Mateus 6:34" },
  ],

  shopping: [
    { texto: "O meu Deus suprirá cada necessidade de vocês conforme as gloriosas riquezas que tem em Cristo Jesus.", referencia: "Filipenses 4:19" },
    { texto: "Vejam se não abrirei as janelas dos céus e não derramarei sobre vocês bênçãos além da medida.", referencia: "Malaquias 3:10" },
    { texto: "Busquem em primeiro lugar o reino de Deus e a sua justiça, e todas essas coisas serão acrescentadas a vocês.", referencia: "Mateus 6:33" },
    { texto: "O SENHOR Deus é sol e escudo; o SENHOR concede graça e glória; não recusará coisa alguma boa aos que andam na integridade.", referencia: "Salmos 84:11" },
    { texto: "Se vocês, que são maus, sabem dar coisas boas aos seus filhos, quanto mais o Pai de vocês que está nos céus dará boas dádivas.", referencia: "Mateus 7:11" },
    { texto: "Deus é poderoso para fazer que toda graça abunde para vocês, a fim de que tenham tudo o que precisam.", referencia: "2 Coríntios 9:8" },
    { texto: "Considerem os corvos: não semeiam, não colhem; contudo, Deus os alimenta. Quanto mais vocês valem do que as aves!", referencia: "Lucas 12:24" },
    { texto: "Não se preocupem com coisa alguma; em tudo, por oração e súplicas, com ação de graças, apresentem seus pedidos a Deus.", referencia: "Filipenses 4:6" },
    { texto: "Aquele que não poupou o próprio Filho, como não nos dará também, junto com ele, todas as coisas?", referencia: "Romanos 8:32" },
    { texto: "Antes de clamarem, eu responderei; enquanto ainda estiverem falando, eu ouvirei.", referencia: "Isaías 65:24" },
    { texto: "Abres a tua mão e satisfazes o desejo de todos os seres vivos.", referencia: "Salmos 145:16" },
    { texto: "Honre o SENHOR com as suas riquezas, com as primícias de toda a sua produção; então os seus celeiros se encherão.", referencia: "Provérbios 3:9-10" },
    { texto: "Bendito será você ao entrar e bendito ao sair.", referencia: "Deuteronômio 28:6" },
    { texto: "O jovem leão pode fraquejar e passar fome, mas os que buscam o SENHOR não terão falta de coisa alguma.", referencia: "Salmos 34:10" },
  ],
};

function getDayOfYear(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function getVersiculoDoDia(tab: TabVersiculos): Versiculo {
  const list = versiculos[tab];
  return list[getDayOfYear() % list.length];
}

export function getVersiculoHome(): Versiculo {
  return getVersiculoDoDia('home');
}
