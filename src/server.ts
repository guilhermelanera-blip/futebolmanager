// Ponto de entrada só para desenvolvimento local (`npm run dev`): sobe um
// processo Express contínuo e liga o scheduler interno (node-cron), que é
// a forma cômoda de testar tudo na sua máquina. Em produção (Vercel) quem
// serve a API é `api/index.ts`, e quem dispara o relógio é o GitHub Actions
// chamando `src/scheduler/cron.routes.ts` de fora — ver `19_INFRAESTRUTURA`.
import "dotenv/config";
import { app } from "./app";
import { iniciarScheduler } from "./scheduler/matchDispatcher";

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`[server] Rodando na porta ${PORT}`);
  iniciarScheduler();
});
