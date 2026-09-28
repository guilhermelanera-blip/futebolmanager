/* Gera o estado inicial do PROTÓTIPO CLICÁVEL do cliente web.
 *
 * Roda os módulos puros do backend (sem banco) para simular parte de uma
 * temporada da Liga Nacional e escreve `web/src/mock/estado.json` — a "API
 * de mentira" que as telas consomem enquanto o cliente real não está ligado
 * na API HTTP.
 *
 * Fica em src/scripts/ (e não em web/) de propósito: web/ é `type: module`,
 * o que quebra o require() dos módulos .ts do backend por ts-node.
 *
 *   npm run mock:web            # na raiz do projeto
 *   npx ts-node --transpile-only src/scripts/gerarMockWeb.ts [seed]
 */
import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "..");
// eslint-disable-next-line @typescript-eslint/no-var-requires
function req(p: string) { return require(path.join(ROOT, p)); }

const { gerarUniverso } = req("modules/liga/universo.generator");
const { gerarCalendarioIdaEVolta } = req("modules/competicao/calendario.generator");
const { simularPartida } = req("modules/partida/engine/simulateMatch");
const { calcularClassificacao } = req("modules/competicao/classificacao.service");
const { aplicarBonusTracos } = req("modules/jogador/tracos");
const { posturaParaMotor } = req("modules/clube/perfilIA");
const { calcularOverall } = req("modules/jogador/overall");
const { calcularValorDeMercado } = req("modules/mercado/mercado.regras");
const { calcularPremiacaoLiga } = req("modules/financas/financas.calc");

const SEED = process.argv[2] || "cliente-proto-1";
const RODADAS_JOGADAS = 12;
const TOTAL_RODADAS = 38;

// relógio fictício: temporada começou 8 semanas atrás, 1 rodada a cada ~3,7 dias
const HOJE = new Date("2026-09-01T00:00:00Z");
const INICIO = new Date(HOJE.getTime() - RODADAS_JOGADAS * 3.7 * 864e5);
function dataDaRodada(r: number): string {
  return new Date(INICIO.getTime() + (r - 1) * 3.7 * 864e5).toISOString().slice(0, 10);
}

// ---------------------------------------------------------------- rng local
function createRng(seed: string) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = createRng(`${SEED}:proto`);
const entre = (lo: number, hi: number) => Math.round(lo + rnd() * (hi - lo));

// ---------------------------------------------------------------- universo
const uni = gerarUniverso({ nomeLiga: "Liga Nacional", seed: SEED });
interface JG {
  nome: string; idade: number; posicao: string; atributos: Record<string, number>;
  potencialOculto: number; moral: number; fadiga: number; formaRecente: number;
  salarioSemanal: number; duracaoContratoAnos: number; tracos: string[];
}
// Nome curto p/ tabelas: última palavra do prefixo + cidade (sem epíteto).
// Ex.: "Associação Atlética Divinópolis Sertão" -> "Atlética Divinópolis".
function curtarNome(nome: string, cidade: string): string {
  const iCidade = nome.indexOf(cidade);
  if (iCidade <= 0) return nome;
  const prefixo = nome.slice(0, iCidade).trim();
  const ultima = prefixo.split(/\s+/).pop() ?? prefixo;
  return `${ultima} ${cidade}`.trim();
}
const clubes = uni.clubes.map((c: any, i: number) => ({
  id: `c${i}`, idx: i, nome: c.nome as string, cidade: c.cidade as string,
  nomeCurto: curtarNome(c.nome as string, c.cidade as string),
  cores: c.cores as string, forca: c.forca as number, reputacao: c.reputacao as number,
  arquetipo: c.perfilIA.arquetipo as string, perfil: c.perfilIA,
  capacidadeEstadio: c.capacidadeEstadio as number, elenco: c.elenco as JG[],
}));
const clubePorId = new Map(clubes.map((c) => [c.id, c]));
const resumoClube = (c: typeof clubes[number]) => ({ id: c.id, nome: c.nome, nomeCurto: c.nomeCurto, cidade: c.cidade, cores: c.cores });

function paraTime(c: typeof clubes[number]) {
  const jogadores = c.elenco.map((j) => {
    const a = aplicarBonusTracos(j.atributos, j.tracos);
    return {
      finalizacao: a.finalizacao, passe: a.passe, drible: a.drible, marcacao: a.marcacao,
      desarme: a.desarme, velocidade: a.velocidade, posicionamento: a.posicionamento,
      reflexos: a.reflexos, saidaDeGol: a.saidaDeGol, ehGoleiro: j.posicao === "GOLEIRO",
    };
  });
  return { clubeId: c.id, jogadores, postura: posturaParaMotor(c.perfil.posturaTatica) };
}
const times = clubes.map(paraTime);

// ---------------------------------------------------------------- liga parcial
const fixtures = gerarCalendarioIdaEVolta(20, `${SEED}:cal`);
const PESO_GOL: Record<string, number> = {
  ATACANTE: 4, PONTA: 4, MEIA: 3, LATERAL: 2, VOLANTE: 1, ZAGUEIRO: 1, GOLEIRO: 0,
};
function escolhePonderado(rng: () => number, elenco: JG[], peso: (j: JG) => number): JG {
  const total = elenco.reduce((s, j) => s + peso(j), 0);
  if (total <= 0) return elenco[0];
  let r = rng() * total;
  for (const j of elenco) { r -= peso(j); if (r < 0) return j; }
  return elenco[elenco.length - 1];
}

// Simula TODAS as 38 rodadas. O "relógio" fica no cliente: ele revela a
// temporada rodada a rodada e recalcula tabela/artilharia a cada avanço.
const partidas = fixtures.map((f: any) => {
  const r = simularPartida(
    times[f.mandanteIndex], times[f.visitanteIndex],
    `${SEED}:L:${f.rodada}:${f.mandanteIndex}:${f.visitanteIndex}`
  );
  return {
    rodada: f.rodada as number, data: dataDaRodada(f.rodada),
    mandanteId: clubes[f.mandanteIndex].id, visitanteId: clubes[f.visitanteIndex].id,
    golsMandante: r.golsMandante as number, golsVisitante: r.golsVisitante as number,
    eventos: r.eventos as any[],
  };
});

// gols atribuídos a jogadores, com a rodada — o cliente soma por rodada <= N.
const golsTimeline: { rodada: number; clubeId: string; jogador: string; posicao: string }[] = [];
for (const p of partidas) {
  const rng = createRng(`${SEED}:L:${p.rodada}:atrib`);
  for (const e of p.eventos) {
    if (e.tipo !== "GOL") continue;
    const c = clubePorId.get(e.clubeId)!;
    const j = escolhePonderado(rng, c.elenco, (jj) => PESO_GOL[jj.posicao] ?? 1);
    golsTimeline.push({ rodada: p.rodada, clubeId: c.id, jogador: j.nome, posicao: j.posicao });
  }
}

// tabela após as RODADAS_JOGADAS iniciais — só pra escolher o clube do jogador
// (meio de tabela) e semear finanças/notícias iniciais.
const jogadasIniciais = partidas.filter((p) => p.rodada <= RODADAS_JOGADAS);
const tabela = calcularClassificacao(
  clubes.map((c) => ({ id: c.id, nome: c.nome })),
  jogadasIniciais.map((p) => ({
    mandanteId: p.mandanteId, visitanteId: p.visitanteId,
    golsMandante: p.golsMandante, golsVisitante: p.golsVisitante, status: "ENCERRADA",
  }))
);

// ---------------------------------------------------------------- o clube do jogador
// pega o que estiver em 9º — meio de tabela, com o que brigar por cima e por baixo.
const linhaJogador = tabela[8];
const meuClube = clubes.find((c) => c.nome === linhaJogador.nome)!;
const MEU = meuClube.id;

// ---------------------------------------------------------------- artilharia (só das rodadas iniciais)
const golsPorJogador = new Map<string, { nome: string; clubeId: string; clube: string; posicao: string; gols: number }>();
for (const g of golsTimeline) {
  if (g.rodada > RODADAS_JOGADAS) continue;
  const k = `${g.clubeId}:${g.jogador}`;
  const cur = golsPorJogador.get(k) ?? { nome: g.jogador, clubeId: g.clubeId, clube: clubePorId.get(g.clubeId)!.nome, posicao: g.posicao, gols: 0 };
  cur.gols++; golsPorJogador.set(k, cur);
}
const artilharia = [...golsPorJogador.values()].sort((a, b) => b.gols - a.gols).slice(0, 15);
const golsDoMeu = new Map(
  [...golsPorJogador.values()].filter((g) => g.clubeId === MEU).map((g) => [g.nome, g.gols])
);

// ---------------------------------------------------------------- elenco do jogador
const ORDEM_POS = ["GOLEIRO", "ZAGUEIRO", "LATERAL", "VOLANTE", "MEIA", "PONTA", "ATACANTE"];
const elenco = meuClube.elenco
  .map((j, i) => {
    const overall = calcularOverall(j.atributos, j.posicao);
    const valor = calcularValorDeMercado({
      overall, potencial: j.potencialOculto, idade: j.idade,
      formaRecente: j.formaRecente ?? 0, anosRestantesContrato: j.duracaoContratoAnos ?? 2,
    });
    return {
      id: `${MEU}-j${i}`,
      nome: j.nome, posicao: j.posicao, idade: j.idade,
      overall: Math.round(overall * 10) / 10,
      potencial: Math.round(j.potencialOculto),
      valor,
      // 14 atributos da Fase 1 (04 §2), escala 1..20
      atributos: Object.fromEntries(
        Object.entries(j.atributos as Record<string, number>).map(([k, v]) => [k, Math.round(v * 10) / 10])
      ) as Record<string, number>,
      moral: j.moral ?? entre(58, 92),
      fadiga: j.fadiga ?? entre(2, 40),
      forma: j.formaRecente ?? 0,
      tracos: j.tracos ?? [],
      salarioSemanal: j.salarioSemanal ?? 0,
      contratoAnos: j.duracaoContratoAnos ?? 2,
      golsNaTemporada: golsDoMeu.get(j.nome) ?? 0,
      lesionado: false as boolean,
      diasLesao: 0,
    };
  })
  .sort((a, b) => ORDEM_POS.indexOf(a.posicao) - ORDEM_POS.indexOf(b.posicao) || b.overall - a.overall);

// 1-2 lesões plausíveis
const nLesoes = 1 + (rnd() < 0.5 ? 1 : 0);
for (let i = 0; i < nLesoes; i++) {
  const alvo = elenco[entre(0, elenco.length - 1)];
  alvo.lesionado = true;
  alvo.diasLesao = entre(6, 34);
  alvo.fadiga = Math.max(alvo.fadiga, 40);
}

// ---------------------------------------------------------------- calendário / forma
const doMeuClube = partidas
  .filter((p) => p.mandanteId === MEU || p.visitanteId === MEU)
  .map((p) => {
    const casa = p.mandanteId === MEU;
    const advId = casa ? p.visitanteId : p.mandanteId;
    const adv = clubePorId.get(advId)!;
    const jogada = p.rodada <= RODADAS_JOGADAS;
    const gp = jogada ? (casa ? p.golsMandante! : p.golsVisitante!) : null;
    const gc = jogada ? (casa ? p.golsVisitante! : p.golsMandante!) : null;
    const resultado = gp === null ? null : gp > gc! ? "V" : gp < gc! ? "D" : "E";
    return {
      rodada: p.rodada, data: p.data, casa, competicao: "LIGA_NACIONAL",
      adversario: resumoClube(adv),
      golsPro: gp, golsContra: gc, resultado,
    };
  });
const ultimos = doMeuClube.filter((p) => p.resultado).slice(-6);
const proximos = doMeuClube.filter((p) => !p.resultado).slice(0, 5);
const formaStr = ultimos.map((p) => p.resultado).join("");

// ---------------------------------------------------------------- escalação (10 §1, 15 §1)
// XI padrão 4-3-3 a partir do elenco (melhor por posição, ignora lesionados).
const FORMACAO = "4-3-3";
const disp = elenco.filter((j) => !j.lesionado);
function melhores(posicoes: string[], n: number, usados: Set<string>) {
  return disp
    .filter((j) => posicoes.includes(j.posicao) && !usados.has(j.id))
    .sort((a, b) => b.overall - a.overall)
    .slice(0, n);
}
const usadosXI = new Set<string>();
const linhasXI: { faixa: string; jogadores: typeof elenco }[] = [
  { faixa: "Goleiro", jogadores: melhores(["GOLEIRO"], 1, usadosXI) },
  { faixa: "Defesa", jogadores: [] as typeof elenco },
  { faixa: "Meio", jogadores: [] as typeof elenco },
  { faixa: "Ataque", jogadores: [] as typeof elenco },
];
linhasXI[0].jogadores.forEach((j) => usadosXI.add(j.id));
linhasXI[1].jogadores = [...melhores(["ZAGUEIRO"], 2, usadosXI), ...melhores(["LATERAL"], 2, usadosXI)];
linhasXI[1].jogadores.forEach((j) => usadosXI.add(j.id));
linhasXI[2].jogadores = [...melhores(["VOLANTE", "MEIA"], 3, usadosXI)];
linhasXI[2].jogadores.forEach((j) => usadosXI.add(j.id));
linhasXI[3].jogadores = [...melhores(["PONTA", "ATACANTE"], 3, usadosXI)];
linhasXI[3].jogadores.forEach((j) => usadosXI.add(j.id));
// completa o que faltar com quem sobrou
for (const linha of linhasXI) {
  const alvo = linha.faixa === "Goleiro" ? 1 : linha.faixa === "Meio" ? 3 : linha.faixa === "Ataque" ? 3 : 4;
  while (linha.jogadores.length < alvo) {
    const extra = disp.find((j) => !usadosXI.has(j.id));
    if (!extra) break;
    usadosXI.add(extra.id);
    linha.jogadores.push(extra);
  }
}
const titularesIds = linhasXI.flatMap((l) => l.jogadores.map((j) => j.id));
const reservas = elenco.filter((j) => !usadosXI.has(j.id)).slice(0, 7);
const escalacao = {
  formacao: FORMACAO,
  postura: "EQUILIBRADA",
  linhas: linhasXI.map((l) => ({ faixa: l.faixa, jogadores: l.jogadores.map((j) => j.id) })),
  titulares: titularesIds,
  reservas: reservas.map((j) => j.id),
};

// ---------------------------------------------------------------- súmulas das partidas do clube (03, 15 §2)
const PESO_EVENTO: Record<string, number> = {
  ATACANTE: 5, PONTA: 4, MEIA: 3, LATERAL: 2, VOLANTE: 2, ZAGUEIRO: 2, GOLEIRO: 0.2,
};
function atribui(rng: () => number, elencoC: JG[], tipo: string): string {
  const peso = (j: JG) => {
    if (tipo === "GOL") return PESO_GOL[j.posicao] ?? 1;
    if (tipo === "LESAO") return 1 + ((j.tracos ?? []).includes("PROPENSO_LESAO") ? 2 : 0);
    return PESO_EVENTO[j.posicao] ?? 1;
  };
  return escolhePonderado(rng, elencoC, peso).nome;
}
const partidasDetalhe = partidas
  .filter((p) => p.mandanteId === MEU || p.visitanteId === MEU)
  .map((p) => {
    const casa = p.mandanteId === MEU;
    const advId = casa ? p.visitanteId : p.mandanteId;
    const adv = clubePorId.get(advId)!;
    // súmula completa das 38 rodadas; o cliente só mostra as já jogadas.
    const base = {
      rodada: p.rodada, data: p.data, casa, competicao: "LIGA_NACIONAL",
      mandante: resumoClube(clubePorId.get(p.mandanteId)!),
      visitante: resumoClube(clubePorId.get(p.visitanteId)!),
      adversario: resumoClube(adv),
    };
    const rng = createRng(`${SEED}:sumula:${p.rodada}`);
    const elMand = clubePorId.get(p.mandanteId)!.elenco;
    const elVis = clubePorId.get(p.visitanteId)!.elenco;
    const eventos = p.eventos
      .slice()
      .sort((a: any, b: any) => a.minuto - b.minuto)
      .map((e: any) => {
        const ehMandante = e.clubeId === p.mandanteId;
        return {
          minuto: e.minuto, tipo: e.tipo, lado: ehMandante ? "mandante" : "visitante",
          clube: (ehMandante ? clubePorId.get(p.mandanteId)! : clubePorId.get(p.visitanteId)!).nome,
          jogador: atribui(rng, ehMandante ? elMand : elVis, e.tipo),
        };
      });
    const cont = (lado: string, tipo: string) => eventos.filter((x) => x.lado === lado && x.tipo === tipo).length;
    const gp = casa ? p.golsMandante! : p.golsVisitante!;
    const gc = casa ? p.golsVisitante! : p.golsMandante!;
    return {
      ...base,
      jogada: true,
      golsMandante: p.golsMandante, golsVisitante: p.golsVisitante,
      resultado: gp > gc ? "V" : gp < gc ? "D" : "E",
      eventos,
      estatisticas: {
        golsMandante: p.golsMandante, golsVisitante: p.golsVisitante,
        amarelosMandante: cont("mandante", "CARTAO_AMARELO"), amarelosVisitante: cont("visitante", "CARTAO_AMARELO"),
        vermelhosMandante: cont("mandante", "CARTAO_VERMELHO"), vermelhosVisitante: cont("visitante", "CARTAO_VERMELHO"),
        lesoesMandante: cont("mandante", "LESAO"), lesoesVisitante: cont("visitante", "LESAO"),
      },
    };
  });

// tabela completa (com metadados de exibição)
const classificacao = tabela.map((l: any) => {
  const c = clubes.find((x) => x.nome === l.nome)!;
  return {
    posicao: l.posicao, id: c.id, nome: c.nome, nomeCurto: c.nomeCurto, cidade: c.cidade, cores: c.cores,
    arquetipo: c.arquetipo,
    jogos: l.jogos, vitorias: l.vitorias, empates: l.empates, derrotas: l.derrotas,
    golsPro: l.golsPro, golsContra: l.golsContra, saldo: l.saldo, pontos: l.pontos,
    ehVoce: c.id === MEU,
  };
});
const minhaLinha = classificacao.find((l) => l.ehVoce)!;

// ---------------------------------------------------------------- finanças
const folhaSemanal = meuClube.elenco.reduce((s, j) => s + (j.salarioSemanal ?? 0), 0);
const patrocinioSemanal = Math.round(120_000 + meuClube.reputacao * 5_400);
const manutencaoSemanal = Math.round(38_000 + meuClube.capacidadeEstadio * 0.9);
const publicoMedio = Math.round(meuClube.capacidadeEstadio * (0.55 + rnd() * 0.3));
const precoIngresso = 60;
const saldoCaixa = Math.round((0.6 + rnd() * 1.6) * folhaSemanal * 8);

const TIPOS_REC = ["RECEITA_BILHETERIA", "RECEITA_PATROCINIO", "RECEITA_PREMIACAO"];
const TIPOS_DESP = ["DESPESA_FOLHA", "DESPESA_MANUTENCAO", "DESPESA_TRANSFERENCIA"];
const historico: any[] = [];
for (let s = 0; s < 10; s++) {
  const d = new Date(HOJE.getTime() - s * 7 * 864e5).toISOString().slice(0, 10);
  historico.push({ data: d, tipo: "RECEITA_PATROCINIO", descricao: "Cota semanal de patrocínio", valor: patrocinioSemanal });
  historico.push({ data: d, tipo: "DESPESA_FOLHA", descricao: "Folha salarial semanal", valor: -folhaSemanal });
  historico.push({ data: d, tipo: "DESPESA_MANUTENCAO", descricao: "Manutenção de estádio e CT", valor: -manutencaoSemanal });
  if (s % 2 === 0) {
    historico.push({
      data: d, tipo: "RECEITA_BILHETERIA",
      descricao: `Bilheteria — ${publicoMedio.toLocaleString("pt-BR")} pagantes`,
      valor: publicoMedio * precoIngresso,
    });
  }
}
historico.sort((a, b) => (a.data < b.data ? 1 : -1));

const premiacaoProjetada = calcularPremiacaoLiga({
  posicao: minhaLinha.posicao, qtdeClubes: 20, premioCampeao: 40_000_000, premioUltimo: 4_000_000,
});

const resultadoSemanalSemBilheteria = patrocinioSemanal - folhaSemanal - manutencaoSemanal;
const alertasFin: any[] = [];
if (saldoCaixa < folhaSemanal * 4) {
  alertasFin.push({
    nivel: 1, codigo: "PROJECAO_CAIXA_NEGATIVO",
    mensagem: "No ritmo atual de gastos, o caixa fecha o mês no vermelho. Reveja folha ou preço de ingresso.",
  });
}

// ---------------------------------------------------------------- mercado
const outros = clubes.filter((c) => c.id !== MEU);
function alvoDe(c: typeof clubes[number], j: JG, i: number) {
  const overall = calcularOverall(j.atributos, j.posicao);
  return {
    id: `${c.id}-alvo${i}`,
    nome: j.nome, posicao: j.posicao, idade: j.idade,
    overall: Math.round(overall * 10) / 10,
    valor: calcularValorDeMercado({
      overall, potencial: j.potencialOculto, idade: j.idade,
      formaRecente: j.formaRecente ?? 0, anosRestantesContrato: j.duracaoContratoAnos ?? 2,
    }),
    tracos: j.tracos ?? [],
    clube: resumoClube(c),
  };
}
const alvos: any[] = [];
for (const c of outros) {
  const ord = [...c.elenco].sort(
    (a, b) => calcularOverall(b.atributos, b.posicao) - calcularOverall(a.atributos, a.posicao)
  );
  alvos.push(alvoDe(c, ord[0], 0));
  if (rnd() < 0.4) alvos.push(alvoDe(c, ord[1], 1));
}
alvos.sort((a, b) => b.overall - a.overall);

const jovemAlvo = alvos.find((a) => a.idade <= 22) ?? alvos[3];
const vetSaindo = [...elenco].reverse().find((j) => j.idade >= 30) ?? elenco[elenco.length - 1];
const propostasRecebidas = [
  {
    id: "prop-r1", jogador: { nome: vetSaindo.nome, posicao: vetSaindo.posicao, idade: vetSaindo.idade, overall: vetSaindo.overall },
    clube: resumoClube(outros[entre(0, outros.length - 1)]),
    tipo: "COMPRA", valor: Math.round(vetSaindo.valor * 0.85), status: "PENDENTE",
    recebidaEm: new Date(HOJE.getTime() - 2 * 864e5).toISOString().slice(0, 10),
  },
];
const propostasEnviadas = [
  {
    id: "prop-e1", jogador: { nome: jovemAlvo.nome, posicao: jovemAlvo.posicao, idade: jovemAlvo.idade, overall: jovemAlvo.overall },
    clube: jovemAlvo.clube, tipo: "COMPRA", valor: Math.round(jovemAlvo.valor * 0.9),
    status: "CONTRAPROPOSTA", contraproposta: Math.round(jovemAlvo.valor * 1.15),
    enviadaEm: new Date(HOJE.getTime() - 4 * 864e5).toISOString().slice(0, 10),
  },
];

// ---------------------------------------------------------------- notícias
const campeaoParcial = classificacao[0];
const lanterna = classificacao[classificacao.length - 1];
const goleada = [...jogadasIniciais].sort(
  (a, b) => Math.abs(b.golsMandante! - b.golsVisitante!) - Math.abs(a.golsMandante! - a.golsVisitante!)
)[0];
const noticias = [
  {
    data: dataDaRodada(RODADAS_JOGADAS), tag: "RESULTADO",
    manchete: `${campeaoParcial.nome} dispara na ponta após ${RODADAS_JOGADAS} rodadas`,
    corpo: `Com ${campeaoParcial.pontos} pontos, o clube de ${campeaoParcial.cidade} abre boa vantagem. ${lanterna.nome} amarga a lanterna com ${lanterna.pontos}.`,
  },
  {
    data: dataDaRodada(goleada.rodada), tag: "RESULTADO",
    manchete: `${clubePorId.get(goleada.golsMandante! >= goleada.golsVisitante! ? goleada.mandanteId : goleada.visitanteId)!.nome} atropela na rodada ${goleada.rodada}`,
    corpo: `Placar de ${Math.max(goleada.golsMandante!, goleada.golsVisitante!)} a ${Math.min(goleada.golsMandante!, goleada.golsVisitante!)} — a maior diferença de gols da temporada até agora.`,
  },
  {
    data: new Date(HOJE.getTime() - 4 * 864e5).toISOString().slice(0, 10), tag: "MERCADO",
    manchete: `${jovemAlvo.clube.nome} pede mais para liberar ${jovemAlvo.nome}`,
    corpo: `A diretoria respondeu à sua proposta com uma contraproposta de R$ ${(propostasEnviadas[0].contraproposta / 1e6).toFixed(1)} mi. A janela ainda está aberta.`,
  },
  {
    data: new Date(HOJE.getTime() - 6 * 864e5).toISOString().slice(0, 10), tag: "CLUBE",
    manchete: `Departamento médico: ${elenco.filter((j) => j.lesionado).length} desfalque(s) no elenco`,
    corpo: elenco.filter((j) => j.lesionado).map((j) => `${j.nome} (${j.diasLesao} dias)`).join(", ") || "Elenco sem lesões no momento.",
  },
];

// ---------------------------------------------------------------- monta o estado
const estado = {
  geradoEm: new Date().toISOString(),
  seed: SEED,
  hoje: HOJE.toISOString().slice(0, 10),
  conta: { id: "u1", nome: "Você", email: "voce@exemplo.com" },
  liga: {
    id: "l1", nome: "Liga Nacional",
    rodadaAtual: RODADAS_JOGADAS + 1, totalRodadas: TOTAL_RODADAS,
  },
  clube: {
    id: meuClube.id, nome: meuClube.nome, nomeCurto: meuClube.nomeCurto, cidade: meuClube.cidade, cores: meuClube.cores,
    arquetipo: null, reputacao: meuClube.reputacao, capacidadeEstadio: meuClube.capacidadeEstadio,
    posicao: minhaLinha.posicao, pontos: minhaLinha.pontos, forma: formaStr,
    saldoCaixa, tamanhoElenco: elenco.length,
    lesionados: elenco.filter((j) => j.lesionado).length,
  },
  classificacao,
  elenco,
  escalacao,
  partidasDetalhe,
  artilharia,
  // simulação completa — o "relógio" do cliente deriva tabela/artilharia/
  // calendário a partir daqui, revelando rodada a rodada (pilar: persistência viva).
  simulacao: {
    rodadaInicial: RODADAS_JOGADAS,
    totalRodadas: TOTAL_RODADAS,
    meuClubeId: MEU,
    clubes: clubes.map((c) => ({
      id: c.id, nome: c.nome, nomeCurto: c.nomeCurto, cidade: c.cidade, cores: c.cores, arquetipo: c.arquetipo,
    })),
    partidas: partidas.map((p) => ({
      rodada: p.rodada, data: p.data,
      mandanteId: p.mandanteId, visitanteId: p.visitanteId,
      golsMandante: p.golsMandante, golsVisitante: p.golsVisitante,
    })),
    gols: golsTimeline,
  },
  calendario: {
    proximos, ultimos,
    todos: partidas.map((p) => ({
      rodada: p.rodada, data: p.data,
      mandante: resumoClube(clubePorId.get(p.mandanteId)!),
      visitante: resumoClube(clubePorId.get(p.visitanteId)!),
      golsMandante: p.rodada <= RODADAS_JOGADAS ? p.golsMandante : null,
      golsVisitante: p.rodada <= RODADAS_JOGADAS ? p.golsVisitante : null,
      envolveVoce: p.mandanteId === MEU || p.visitanteId === MEU,
    })),
  },
  financas: {
    clubeId: meuClube.id, nome: meuClube.nome,
    saldoCaixa, precoIngresso, capacidadeEstadio: meuClube.capacidadeEstadio,
    publicoMedio,
    projecaoSemanal: {
      patrocinio: patrocinioSemanal, folha: folhaSemanal, manutencao: manutencaoSemanal,
      resultadoSemanalSemBilheteria,
    },
    premiacaoProjetada,
    receitaAnualEstimada: Math.round((patrocinioSemanal + publicoMedio * precoIngresso * 0.5) * 52),
    risco: { diasCaixaNegativoConsecutivos: 0, folhaEmAtraso: false, dividaAtual: Math.max(0, -saldoCaixa) },
    alertas: alertasFin,
    conselho: { relacao: 70, votosRecentes: [] as any[] },
    historico: historico.slice(0, 24),
  },
  mercado: {
    janelaAberta: true,
    fecha: new Date(HOJE.getTime() + 26 * 864e5).toISOString().slice(0, 10),
    alvos: alvos.slice(0, 24),
    propostasRecebidas,
    propostasEnviadas,
  },
  noticias,
};

const dest = path.resolve(__dirname, "..", "..", "web", "src", "mock", "estado.json");
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, JSON.stringify(estado, null, 2));
console.log("escrito:", dest);
console.log(`clube do jogador: ${meuClube.nome} — ${minhaLinha.posicao}º lugar, ${minhaLinha.pontos} pts, forma ${formaStr}`);
console.log(`elenco: ${elenco.length} jogadores | folha/sem: R$ ${(folhaSemanal / 1e6).toFixed(2)} mi | caixa: R$ ${(saldoCaixa / 1e6).toFixed(2)} mi`);
console.log(`mercado: ${alvos.length} alvos, ${propostasRecebidas.length} proposta(s) recebida(s)`);
