import "dotenv/config";
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
import { iniciarScheduler } from "./scheduler/matchDispatcher";

const app = express();
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

app.get("/health", (_req, res) => res.json({ status: "ok" }));

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`[server] Rodando na porta ${PORT}`);
  iniciarScheduler();
});
