import { Router } from "express";
import {
  registrar,
  login,
  logout,
  perfil,
  excluirConta,
  ErroConta,
} from "./conta.service";
import { autenticar, comAuth } from "../../middleware/autenticar";

// 17_API, seção 2: domínio /conta — autenticação e perfil.
export const contaRouter = Router();

function ipDaRequest(req: { ip?: string; socket: { remoteAddress?: string } }): string | undefined {
  return req.ip ?? req.socket.remoteAddress ?? undefined;
}

function tratarErro(res: import("express").Response, err: unknown) {
  if (err instanceof ErroConta) return res.status(err.status).json({ erro: err.message });
  console.error("[conta] erro inesperado:", err);
  return res.status(500).json({ erro: "Erro interno." });
}

// POST /v1/conta/registro
contaRouter.post("/registro", async (req, res) => {
  try {
    const { email, nome, senha, consentimentoLGPD } = req.body ?? {};
    const r = await registrar({ email, nome, senha, consentimentoLGPD }, ipDaRequest(req));
    res.status(201).json(r);
  } catch (err) {
    tratarErro(res, err);
  }
});

// POST /v1/conta/login
contaRouter.post("/login", async (req, res) => {
  try {
    const { email, senha } = req.body ?? {};
    const r = await login(email, senha, ipDaRequest(req));
    res.json(r);
  } catch (err) {
    tratarErro(res, err);
  }
});

// POST /v1/conta/logout — revoga a sessão atual
contaRouter.post(
  "/logout",
  autenticar,
  comAuth(async (req, res) => {
    try {
      await logout(req.sessaoId);
      res.status(204).end();
    } catch (err) {
      tratarErro(res, err);
    }
  })
);

// GET /v1/conta/eu — perfil do usuário autenticado
contaRouter.get(
  "/eu",
  autenticar,
  comAuth(async (req, res) => {
    try {
      res.json(await perfil(req.usuario.id));
    } catch (err) {
      tratarErro(res, err);
    }
  })
);

// DELETE /v1/conta/eu — exclusão de conta (LGPD art. 18)
contaRouter.delete(
  "/eu",
  autenticar,
  comAuth(async (req, res) => {
    try {
      await excluirConta(req.usuario.id, ipDaRequest(req));
      res.status(204).end();
    } catch (err) {
      tratarErro(res, err);
    }
  })
);
