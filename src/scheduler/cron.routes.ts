// Endpoints que substituem o node-cron em produção: em vez de um processo
// ficar ligado esperando a hora certa (o que custaria dinheiro 24/7), quem
// "acorda" a liga é um agendamento GRATUITO do GitHub Actions chamando essas
// rotas de fora, na hora certa (America/Sao_Paulo — 08_RELOGIO, seção 5).
// Protegidas por um segredo compartilhado simples: só quem sabe o valor de
// CRON_SECRET consegue disparar.
import { Router, Request } from "express";
import { tickDiario } from "./tickDiario";
import { dispararRodadaDoDia, rodarCicloSemanalFinanceiro } from "./matchDispatcher";

export const cronRouter = Router();

function autorizado(req: Request): boolean {
  const segredo = process.env.CRON_SECRET;
  if (!segredo) return false; // sem segredo configurado, ninguém entra
  return req.get("x-cron-secret") === segredo;
}

cronRouter.post("/tick", async (req, res) => {
  if (!autorizado(req)) return res.status(401).json({ erro: "não autorizado" });
  try {
    const resumo = await tickDiario(new Date());
    res.json({ ok: true, resumo });
  } catch (err) {
    console.error("[scheduler:tick]", err);
    res.status(500).json({ ok: false, erro: String(err) });
  }
});

cronRouter.post("/rodada", async (req, res) => {
  if (!autorizado(req)) return res.status(401).json({ erro: "não autorizado" });
  try {
    await dispararRodadaDoDia();
    res.json({ ok: true });
  } catch (err) {
    console.error("[scheduler:rodada]", err);
    res.status(500).json({ ok: false, erro: String(err) });
  }
});

cronRouter.post("/financas-semanais", async (req, res) => {
  if (!autorizado(req)) return res.status(401).json({ erro: "não autorizado" });
  try {
    await rodarCicloSemanalFinanceiro();
    res.json({ ok: true });
  } catch (err) {
    console.error("[scheduler:financas-semanais]", err);
    res.status(500).json({ ok: false, erro: String(err) });
  }
});
