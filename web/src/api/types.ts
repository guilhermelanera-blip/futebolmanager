/* Formato dos dados que as telas consomem. Hoje vem de mock/estado.json;
   amanhã, das respostas da API HTTP — o formato é o mesmo de propósito. */

export interface ClubeResumo {
  id: string;
  nome: string;
  /** Nome curto (2 palavras) para tabelas/listas. Ex.: "Atlética Divinópolis". */
  nomeCurto: string;
  cidade: string;
  cores: string;
}

export interface ClubeInfo extends ClubeResumo {
  arquetipo: string | null;
  reputacao: number;
  capacidadeEstadio: number;
  posicao: number;
  pontos: number;
  forma: string;
  saldoCaixa: number;
  tamanhoElenco: number;
  lesionados: number;
}

export interface LinhaTabela {
  posicao: number;
  id: string;
  nome: string;
  nomeCurto: string;
  cidade: string;
  cores: string;
  arquetipo: string;
  jogos: number;
  vitorias: number;
  empates: number;
  derrotas: number;
  golsPro: number;
  golsContra: number;
  saldo: number;
  pontos: number;
  ehVoce: boolean;
}

export interface Jogador {
  id: string;
  nome: string;
  /** Apelido definido pelo usuário (vazio se não houver). */
  apelido: string;
  /** Nome a exibir: apelido se houver, senão o nome. */
  nomeExibido: string;
  /** Número da camisa (padrão pela posição/overall, ou manual). */
  numero: number;
  posicao: string;
  idade: number;
  overall: number;
  potencial: number;
  valor: number;
  atributos: Record<string, number>;
  moral: number;
  fadiga: number;
  forma: number;
  tracos: string[];
  salarioSemanal: number;
  contratoAnos: number;
  golsNaTemporada: number;
  lesionado: boolean;
  diasLesao: number;
}

export interface Escalacao {
  formacao: string;
  postura: string;
  linhas: { faixa: string; jogadores: string[] }[];
  titulares: string[];
  reservas: string[];
}

export interface EventoSumula {
  minuto: number;
  tipo: "GOL" | "CARTAO_AMARELO" | "CARTAO_VERMELHO" | "LESAO";
  lado: "mandante" | "visitante";
  clube: string;
  jogador: string;
}

export interface PartidaDetalhe {
  rodada: number;
  data: string;
  casa: boolean;
  competicao: string;
  mandante: ClubeResumo;
  visitante: ClubeResumo;
  adversario: ClubeResumo;
  jogada: boolean;
  golsMandante: number | null;
  golsVisitante: number | null;
  resultado: "V" | "E" | "D" | null;
  eventos: EventoSumula[];
  estatisticas: {
    golsMandante: number; golsVisitante: number;
    amarelosMandante: number; amarelosVisitante: number;
    vermelhosMandante: number; vermelhosVisitante: number;
    lesoesMandante: number; lesoesVisitante: number;
  } | null;
}

export interface ArtilheiroLinha {
  nome: string;
  clubeId: string;
  clube: string;
  posicao: string;
  gols: number;
}

export interface JogoDoClube {
  rodada: number;
  data: string;
  casa: boolean;
  competicao: string;
  adversario: ClubeResumo;
  golsPro: number | null;
  golsContra: number | null;
  resultado: "V" | "E" | "D" | null;
}

export interface JogoTabela {
  rodada: number;
  data: string;
  mandante: ClubeResumo;
  visitante: ClubeResumo;
  golsMandante: number | null;
  golsVisitante: number | null;
  envolveVoce: boolean;
}

export interface AlertaFinanceiro {
  nivel: number;
  codigo: string;
  mensagem: string;
}

export interface Movimentacao {
  data: string;
  tipo: string;
  descricao: string;
  valor: number;
}

export interface Financas {
  clubeId: string;
  nome: string;
  saldoCaixa: number;
  precoIngresso: number;
  capacidadeEstadio: number;
  publicoMedio: number;
  projecaoSemanal: {
    patrocinio: number;
    folha: number;
    manutencao: number;
    resultadoSemanalSemBilheteria: number;
  };
  premiacaoProjetada: number;
  receitaAnualEstimada: number;
  risco: { diasCaixaNegativoConsecutivos: number; folhaEmAtraso: boolean; dividaAtual: number };
  alertas: AlertaFinanceiro[];
  conselho: { relacao: number; votosRecentes: unknown[] };
  historico: Movimentacao[];
}

export interface Alvo {
  id: string;
  nome: string;
  posicao: string;
  idade: number;
  overall: number;
  valor: number;
  tracos: string[];
  clube: ClubeResumo;
}

export interface PropostaRecebida {
  id: string;
  jogador: { nome: string; posicao: string; idade: number; overall: number };
  clube: ClubeResumo;
  tipo: string;
  valor: number;
  status: string;
  recebidaEm: string;
}

export interface PropostaEnviada {
  id: string;
  jogador: { nome: string; posicao: string; idade: number; overall: number };
  clube: ClubeResumo;
  tipo: string;
  valor: number;
  status: string;
  contraproposta: number;
  enviadaEm: string;
}

export interface Mercado {
  janelaAberta: boolean;
  fecha: string;
  alvos: Alvo[];
  propostasRecebidas: PropostaRecebida[];
  propostasEnviadas: PropostaEnviada[];
}

export interface Noticia {
  data: string;
  tag: string;
  manchete: string;
  corpo: string;
}

export interface SimClube {
  id: string;
  nome: string;
  nomeCurto: string;
  cidade: string;
  cores: string;
  arquetipo: string;
}

export interface SimPartida {
  rodada: number;
  data: string;
  mandanteId: string;
  visitanteId: string;
  golsMandante: number;
  golsVisitante: number;
}

export interface SimGol {
  rodada: number;
  clubeId: string;
  jogador: string;
  posicao: string;
}

export interface Simulacao {
  rodadaInicial: number;
  totalRodadas: number;
  meuClubeId: string;
  clubes: SimClube[];
  partidas: SimPartida[];
  gols: SimGol[];
}

export interface Estado {
  geradoEm: string;
  seed: string;
  hoje: string;
  conta: { id: string; nome: string; email: string };
  liga: { id: string; nome: string; rodadaAtual: number; totalRodadas: number };
  clube: ClubeInfo;
  classificacao: LinhaTabela[];
  elenco: Jogador[];
  escalacao: Escalacao;
  partidasDetalhe: PartidaDetalhe[];
  simulacao: Simulacao;
  artilharia: ArtilheiroLinha[];
  calendario: {
    proximos: JogoDoClube[];
    ultimos: JogoDoClube[];
    todos: JogoTabela[];
  };
  financas: Financas;
  mercado: Mercado;
  noticias: Noticia[];
}
