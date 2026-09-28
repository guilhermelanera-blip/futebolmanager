// Geração de nomes 100% fictícios para clubes e pessoas.
//
// Cumpre 00_REGRAS_IMUTAVEIS R6/R7: nenhuma reprodução de nomes, marcas ou
// identidades reais — válido inclusive para dados gerados durante o
// desenvolvimento (21_PROMPT_MESTRE_CLAUDE, seção 3). R5 permite usar
// cidades reais do Brasil como sede de clubes fictícios.
//
// Todos os geradores são DETERMINÍSTICOS: recebem um RNG com seed
// (utils/rng.ts) e, dado o mesmo seed, produzem sempre os mesmos nomes.
// Isso mantém a geração do universo auditável e reproduzível, no mesmo
// espírito de R21.

// ---------------------------------------------------------------------------
// Blocklist de segurança
// ---------------------------------------------------------------------------
// Os geradores combinam termos genéricos do futebol + cidade real + epíteto
// inventado, então uma colisão com um nome real é altamente improvável por
// construção. Ainda assim, toda saída passa por `contemMarcaReal()` como
// segunda checagem e é regerada se houver acerto. A lista está normalizada
// (minúsculas, sem acento) e cobre os clubes reais mais conhecidos do
// Brasil e da CONMEBOL, além de sobrenomes de personalidades muito famosas.
const MARCAS_REAIS_NORMALIZADAS: string[] = [
  // Brasil
  "flamengo", "fluminense", "botafogo", "vasco", "palmeiras", "corinthians",
  "santos", "sao paulo", "gremio", "internacional", "cruzeiro", "atletico mineiro",
  "athletico", "atletico paranaense", "bahia", "vitoria", "sport recife", "nautico",
  "ceara", "fortaleza", "goias", "coritiba", "chapecoense", "ponte preta",
  "guarani", "parana", "avai", "figueirense", "juventude", "bragantino",
  "red bull", "america mineiro", "atletico goianiense", "cuiaba", "criciuma",
  "remo", "paysandu", "csa", "sampaio correa", "brusque", "ituano", "mirassol",
  // CONMEBOL
  "boca juniors", "river plate", "racing club", "independiente", "san lorenzo",
  "velez sarsfield", "estudiantes", "rosario central", "newells", "huracan",
  "nacional", "penarol", "colo colo", "universidad de chile", "union espanola",
  "olimpia", "cerro porteno", "libertad", "barcelona sc", "emelec",
  "liga de quito", "millonarios", "atletico nacional", "deportivo cali",
  "junior barranquilla", "the strongest", "bolivar", "alianza lima",
  "universitario", "sporting cristal", "caracas fc", "deportivo tachira",
  // Sobrenomes/apelidos de personalidades muito conhecidas (R7)
  "pele", "maradona", "ronaldinho", "neymar", "messi", "romario", "zico",
  "garrincha", "socrates", "rivaldo", "ronaldo nazario", "kaka", "cafu",
];

/** Normaliza para comparação: minúsculas, sem acento, espaços colapsados. */
export function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** True se `texto` contém (como substring de palavra) alguma marca real conhecida. */
export function contemMarcaReal(texto: string): boolean {
  const alvo = normalizar(texto);
  return MARCAS_REAIS_NORMALIZADAS.some((marca) => alvo.includes(marca));
}

// ---------------------------------------------------------------------------
// Pools de vocabulário
// ---------------------------------------------------------------------------
// Termos genéricos e universais de nomenclatura de clube de futebol. Foram
// escolhidos deliberadamente termos que, isolados, NÃO evocam um clube real
// específico (por isso não há "Grêmio", "Sporting", "Nacional" etc. como
// prefixo solto).
const PREFIXOS_CLUBE = [
  "Esporte Clube",
  "Associação Atlética",
  "Sociedade Esportiva",
  "Clube Atlético",
  "Clube Desportivo",
  "União Desportiva",
  "Ateneu Esportivo",
  "Centro Esportivo",
  "Clube Recreativo", // (era "Grêmio Recreativo" — removido: colide com o clube real "gremio" na blocklist R6)
  "Real Sociedade Esportiva",
];

// Cidades reais brasileiras (R5). Curadas para evitar pares que resultariam
// em algo próximo de um clube real conhecido (por isso não há Santos, Bahia,
// Vitória, Chapecó, Criciúma etc.).
const CIDADES_BRASIL = [
  "Sorocaba", "Uberlândia", "Londrina", "Maringá", "Joinville", "Blumenau",
  "Caxias do Sul", "Pelotas", "Passo Fundo", "Feira de Santana", "Juazeiro",
  "Petrolina", "Campina Grande", "Mossoró", "Marília", "Bauru", "Franca",
  "Presidente Prudente", "Divinópolis", "Governador Valadares", "Anápolis",
  "Rio Verde", "Dourados", "Rondonópolis", "Marabá", "Araguaína", "Imperatriz",
  "Sobral", "Parnaíba", "Cascavel", "Guarapuava", "Uberaba", "Araçatuba",
  "São Carlos", "Varginha", "Teófilo Otoni", "Cachoeiro de Itapemirim",
  "Ji-Paraná",
];

// Epítetos inventados (mascotes / referências geográficas genéricas).
const EPITETOS = [
  "Fênix", "Bandeirante", "Sertão", "Litoral", "Planalto", "Meridional",
  "Aurora", "Vanguarda", "Cometa", "Titã", "Bravo", "Sentinela", "Íris",
  "Guará", "Corcel", "Falcão", "Jaguar", "Tornado", "Vulcão", "Boreal",
];

const PRENOMES = [
  "Adriano", "Alan", "Bruno", "Caio", "Diego", "Éder", "Fábio", "Gustavo",
  "Heitor", "Ígor", "João", "Kléber", "Lucas", "Matheus", "Nícolas", "Otávio",
  "Pedro", "Rafael", "Samuel", "Thiago", "Vinícius", "Wesley", "Yuri", "André",
  "Bernardo", "Cauã", "Danilo", "Emerson", "Felipe", "Gabriel", "Henrique",
  "Ítalo", "Juan", "Leandro", "Murilo", "Norton", "Osvaldo", "Paulo",
  "Renan", "Sérgio", "Tales", "Ulisses", "Válber", "Wallace",
];

const SOBRENOMES = [
  "Almeida", "Barbosa", "Cardoso", "Duarte", "Esteves", "Ferraz", "Gomes",
  "Henriques", "Iglésias", "Jardim", "Klein", "Lira", "Macedo", "Nogueira",
  "Ourives", "Peçanha", "Quirino", "Rangel", "Salgado", "Teixeira", "Uchôa",
  "Vasques", "Werneck", "Xavier", "Zampieri", "Antunes", "Bittencourt",
  "Carvalho", "Dantas", "Espíndola", "Fontoura", "Guimarães", "Horta",
  "Juvenal", "Lacerda", "Moraes", "Navarro", "Órfão", "Portela", "Rezende",
  "Sampaio", "Tavares", "Valadão",
];

// ---------------------------------------------------------------------------
// Sorteio
// ---------------------------------------------------------------------------
function escolher<T>(rng: () => number, lista: readonly T[]): T {
  return lista[Math.floor(rng() * lista.length)];
}

export interface ClubeGerado {
  nome: string;
  cidade: string;
}

/**
 * Gera um nome de clube fictício. `usados` recebe os nomes já sorteados para
 * garantir unicidade dentro da liga; a função tenta novas combinações até
 * achar um nome inédito e livre de colisão com marcas reais.
 */
export function gerarNomeClube(rng: () => number, usados: Set<string> = new Set()): ClubeGerado {
  for (let tentativa = 0; tentativa < 200; tentativa++) {
    const prefixo = escolher(rng, PREFIXOS_CLUBE);
    const cidade = escolher(rng, CIDADES_BRASIL);
    // ~55% dos clubes ganham um epíteto no fim, dando variedade de formato.
    const comEpiteto = rng() < 0.55;
    const nome = comEpiteto
      ? `${prefixo} ${cidade} ${escolher(rng, EPITETOS)}`
      : `${prefixo} ${cidade}`;

    const chave = normalizar(nome);
    if (usados.has(chave)) continue;
    if (contemMarcaReal(nome)) continue;

    usados.add(chave);
    return { nome, cidade };
  }
  throw new Error("Não foi possível gerar um nome de clube único após 200 tentativas.");
}

/**
 * Gera um nome de pessoa fictícia (jogador, futuramente também staff).
 * Sempre nome + 1 ou 2 sobrenomes — nunca mononome, para não evocar
 * apelidos artísticos de jogadores reais (R7).
 */
export function gerarNomePessoa(rng: () => number, usados: Set<string> = new Set()): string {
  for (let tentativa = 0; tentativa < 200; tentativa++) {
    const prenome = escolher(rng, PRENOMES);
    const sob1 = escolher(rng, SOBRENOMES);
    const doisSobrenomes = rng() < 0.4;
    let nome = `${prenome} ${sob1}`;
    if (doisSobrenomes) {
      const sob2 = escolher(rng, SOBRENOMES);
      if (sob2 !== sob1) nome = `${prenome} ${sob1} ${sob2}`;
    }

    const chave = normalizar(nome);
    if (usados.has(chave)) continue;
    if (contemMarcaReal(nome)) continue;

    usados.add(chave);
    return nome;
  }
  throw new Error("Não foi possível gerar um nome de pessoa único após 200 tentativas.");
}
