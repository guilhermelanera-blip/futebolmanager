import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Protótipo: o front sobe sozinho na 5173. Quando a API HTTP entrar, um proxy
// /v1 -> http://localhost:3000 é adicionado aqui e o cliente troca de camada.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, open: true },
});
