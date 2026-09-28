// Middleware de autenticação. Lê `Authorization: Bearer <token>`, resolve a
// sessão e anexa o usuário autenticado à request.
//
// 17_API, seção 4 / R2: o servidor NUNCA confia numa identidade enviada pelo
// cliente além do que está vinculado ao token de sessão. Endpoints de escrita
// devem, além de exigir este middleware, checar que o usuário é o presidente
// do recurso afetado.

import { Request, Response, NextFunction } from "express";
import { resolverSessao, UsuarioPublico } from "../modules/conta/conta.service";

export interface RequestAutenticada extends Request {
  usuario: UsuarioPublico;
  sessaoId: string;
}

function extrairToken(req: Request): string | null {
  const header = req.header("authorization") ?? "";
  const [esquema, valor] = header.split(" ");
  if (esquema?.toLowerCase() === "bearer" && valor) return valor.trim();
  return null;
}

export async function autenticar(req: Request, res: Response, next: NextFunction) {
  try {
    const token = extrairToken(req);
    if (!token) {
      return res.status(401).json({ erro: "Autenticação necessária (Bearer token)." });
    }
    const ctx = await resolverSessao(token);
    if (!ctx) {
      return res.status(401).json({ erro: "Sessão inválida ou expirada." });
    }
    (req as RequestAutenticada).usuario = ctx.usuario;
    (req as RequestAutenticada).sessaoId = ctx.sessaoId;
    next();
  } catch (err) {
    console.error("[autenticar] erro ao resolver sessão:", err);
    res.status(500).json({ erro: "Erro interno de autenticação." });
  }
}

/** Handler tipado, para rotas já protegidas por `autenticar`. */
export type HandlerAutenticado = (
  req: RequestAutenticada,
  res: Response,
  next: NextFunction
) => unknown;

export function comAuth(handler: HandlerAutenticado) {
  return (req: Request, res: Response, next: NextFunction) =>
    handler(req as RequestAutenticada, res, next);
}
