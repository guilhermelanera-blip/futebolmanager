import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { api, temPerfil, patrociniosOk } from "./api/client";
import AppShell from "./components/AppShell";
import Login from "./screens/Login";
import Onboarding from "./screens/Onboarding";
import EscolherPatrocinios from "./screens/EscolherPatrocinios";
import Dashboard from "./screens/Dashboard";
import JogadorDetalhe from "./screens/JogadorDetalhe";
import ClubeDetalhe from "./screens/ClubeDetalhe";
import Clube from "./screens/Clube";
import Competicoes from "./screens/Competicoes";
import Noticias from "./screens/Noticias";
import AdminUsuarios from "./screens/AdminUsuarios";
import Sumula from "./screens/Sumula";
import AoVivo from "./screens/AoVivo";

function Protegido({ children }: { children: React.ReactNode }) {
  const loc = useLocation();
  if (!api.logado()) return <Navigate to="/login" state={{ de: loc.pathname }} replace />;
  if (!temPerfil()) return <Navigate to="/inicio" replace />;
  if (!patrociniosOk()) return <Navigate to="/patrocinios" replace />;
  return <AppShell>{children}</AppShell>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/inicio"
        element={!api.logado() ? <Navigate to="/login" replace /> : temPerfil() ? <Navigate to="/" replace /> : <Onboarding />}
      />
      <Route
        path="/patrocinios"
        element={
          !api.logado() ? <Navigate to="/login" replace />
            : !temPerfil() ? <Navigate to="/inicio" replace />
              : patrociniosOk() ? <Navigate to="/" replace />
                : <EscolherPatrocinios />
        }
      />
      <Route path="/" element={<Protegido><Dashboard /></Protegido>} />
      <Route path="/jogador/:id" element={<Protegido><JogadorDetalhe /></Protegido>} />
      <Route path="/clube/:id" element={<Protegido><ClubeDetalhe /></Protegido>} />

      <Route path="/clube" element={<Protegido><Clube aba="elenco" /></Protegido>} />
      <Route path="/elenco" element={<Protegido><Clube aba="elenco" /></Protegido>} />
      <Route path="/torcida" element={<Protegido><Clube aba="torcida" /></Protegido>} />
      <Route path="/editar-time" element={<Protegido><Clube aba="editar-time" /></Protegido>} />
      <Route path="/estadio" element={<Protegido><Clube aba="estadio" /></Protegido>} />
      <Route path="/mercado" element={<Protegido><Clube aba="mercado" /></Protegido>} />
      <Route path="/treinos" element={<Protegido><Clube aba="treinos" /></Protegido>} />
      <Route path="/financas" element={<Protegido><Clube aba="financas" /></Protegido>} />

      <Route path="/competicoes" element={<Protegido><Competicoes aba="tabela" /></Protegido>} />
      <Route path="/classificacao" element={<Protegido><Competicoes aba="tabela" /></Protegido>} />
      <Route path="/calendario" element={<Protegido><Competicoes aba="calendario" /></Protegido>} />

      <Route path="/noticias" element={<Protegido><Noticias /></Protegido>} />
      <Route path="/admin" element={<Protegido><AdminUsuarios /></Protegido>} />
      <Route path="/ao-vivo" element={<Protegido><AoVivo /></Protegido>} />
      <Route path="/partida/:rodada" element={<Protegido><Sumula /></Protegido>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
