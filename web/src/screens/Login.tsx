import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { EstadioArte } from "../components/EstadioArte";
import { LogoLiga } from "../components/LogoLiga";

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("voce@exemplo.com");
  const [senha, setSenha] = useState("demo");
  const [erro, setErro] = useState<string | null>(null);
  const [indo, setIndo] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setIndo(true);
    try {
      await api.login(email, senha);
      nav("/", { replace: true });
    } catch (err) {
      setErro((err as Error).message);
      setIndo(false);
    }
  }

  return (
    <div className="login">
      <EstadioArte className="entrada-cena" />
      <div className="entrada-veu" />
      <div className="box">
        <div className="brand">
          <LogoLiga size={46} className="brand-logo" />
          <div>
            <div className="t">Liga Nacional<br />de Futebol Manager</div>
            <div className="s">Simulador de gestão · mundo persistente</div>
          </div>
        </div>

        <h1>Entrar no mundo</h1>
        <p className="lead">
          Vinte clubes, uma liga, o tempo correndo junto com a vida real.
          Assuma um clube e comece a decidir.
        </p>

        <form onSubmit={entrar}>
          <div className="field">
            <label htmlFor="email">E-mail</label>
            <input
              id="email" type="email" autoComplete="username"
              value={email} onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="senha">Senha</label>
            <input
              id="senha" type="password" autoComplete="current-password"
              placeholder="qualquer senha"
              value={senha} onChange={(e) => setSenha(e.target.value)}
            />
          </div>
          {erro && <div style={{ color: "var(--loss)", fontSize: 13, marginTop: 4 }}>{erro}</div>}
          <button className="btn" disabled={indo}>{indo ? "Entrando…" : "Entrar"}</button>
        </form>

        <p className="hintline">
          Protótipo clicável — não há cadastro nem servidor de contas ainda.
          Qualquer e-mail abre a sessão; os campos já vêm preenchidos, é só clicar em Entrar.
        </p>
      </div>
    </div>
  );
}
