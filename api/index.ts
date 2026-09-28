// Entrada da API na Vercel: uma função serverless só, que recebe TODAS as
// rotas (ver o rewrite em vercel.json) e deixa o Express (`src/app.ts`)
// decidir o que fazer com cada uma. Não chama `.listen()` nem o scheduler —
// aqui a função só existe enquanto está atendendo uma requisição.
import { app } from "../src/app";

export default app;
