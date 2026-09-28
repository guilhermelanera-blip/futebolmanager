// A aplicação Express em si — só rotas e middlewares, sem `listen()` e sem
// disparar o scheduler. Importado tanto por `server.ts` (dev local, processo
// contínuo) quanto por `api/index.ts` (produção serverless na Vercel, onde
// cada requisição sobe a função sob demanda — R2/R16, `19_INFRAESTRUTURA`).
import express from "express";
import { contaRouter } from "./modules/conta/conta.routes";
import { ligaRouter } from "./modules/liga/liga.routes";
import { clubeRouter } from "./modules/clube/clube.routes";
import { jogadorRouter } from "./modules/jogador/jogador.routes";
import { partidaRouter } from "./modules/partida/partida.routes";
import { competicaoRouter } from "./modules/competicao/competicao.routes";
import { financasRouter } from "./modules/financas/financas.routes";
import { mercadoRouter } from "./modules/mercado/mercado.routes";
import { chatRouter } from "./modules/chat/chat.routes";
import { cronRouter } from "./scheduler/cron.routes";

export const app = express();
app.use(express.json());

// Versionamento de API (17_API, seção 6)
app.use("/v1/conta", contaRouter);
app.use("/v1/liga", ligaRouter);
app.use("/v1/clube", clubeRouter);
app.use("/v1/jogador", jogadorRouter);
app.use("/v1/partida", partidaRouter);
app.use("/v1/competicao", competicaoRouter);
app.use("/v1/financas", financasRouter);
app.use("/v1/mercado", mercadoRouter);
app.use("/v1/chat", chatRouter);
// Disparado de fora (GitHub Actions), não por um cron interno — ver
// src/scheduler/cron.routes.ts.
app.use("/v1/scheduler", cronRouter);

app.get("/health", (_req, res) => res.json({ status: "ok" }));
