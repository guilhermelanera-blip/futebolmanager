// Seed determinístico de uma partida (03_MOTOR_DE_PARTIDAS, seção 10).
// É derivado só de identificadores estáveis do confronto — nunca de horário
// de execução nem de aleatoriedade "na hora" — para que a simulação seja
// sempre reproduzível e auditável.
//
// Em módulo próprio para não criar ciclo de import entre partida.service,
// calendario.service e copa.service.

export function montarSeedPartida(params: {
  temporadaId: string;
  competicao: string;
  rodada: number;
  mandanteId: string;
  visitanteId: string;
}): string {
  return `${params.temporadaId}:${params.competicao}:${params.rodada}:${params.mandanteId}:${params.visitanteId}`;
}
