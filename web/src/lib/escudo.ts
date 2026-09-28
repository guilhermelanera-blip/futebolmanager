/**
 * Lê um JPEG/PNG enviado pelo usuário e devolve um data URL PNG quadrado
 * (padrão 256×256), com a imagem centralizada em "contain". Reduz o peso para
 * caber tranquilo no localStorage.
 */
const TIPOS_OK = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
const MAX_BYTES = 8 * 1024 * 1024;

export async function arquivoParaEscudo(file: File, lado = 256): Promise<string> {
  if (!TIPOS_OK.includes(file.type)) {
    throw new Error("Envie uma imagem PNG ou JPEG.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Imagem muito grande (máx. 8 MB). Reduza e tente de novo.");
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await carregar(url);
    const cv = document.createElement("canvas");
    cv.width = lado;
    cv.height = lado;
    const ctx = cv.getContext("2d");
    if (!ctx) throw new Error("Não foi possível processar a imagem.");
    const escala = Math.min(lado / img.width, lado / img.height);
    const w = Math.round(img.width * escala);
    const h = Math.round(img.height * escala);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, Math.round((lado - w) / 2), Math.round((lado - h) / 2), w, h);
    return cv.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(url);
  }
}

function carregar(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Arquivo de imagem inválido."));
    img.src = src;
  });
}
