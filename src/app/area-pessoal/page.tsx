import QRCode from "qrcode";
import { exigirPerfil } from "@/lib/permissoes";
import { ligarBaseDados } from "@/lib/mongoose";
import { TokenQR } from "@/models";
import { GeradorQR } from "./gerador-qr";
import { LinkVoltarPainel } from "@/components/link-voltar-painel";
import type { TokenGerado } from "./acoes";

/**
 * Área pessoal do aluno: gerar o código QR dinâmico para a portaria (RF15).
 */
export default async function PaginaAreaPessoal() {
  const sessao = await exigirPerfil(["aluno"]);
  await ligarBaseDados();

  // Se já houver um código válido (ex.: a pessoa atualizou a página), mostra
  // logo esse, em vez de obrigar a gerar outro sem necessidade.
  const tokenExistente = await TokenQR.findOne({
    alunoId: sessao.user.id,
    usado: false,
    validoAte: { $gt: new Date() },
  }).lean();

  let tokenInicial: TokenGerado | null = null;
  if (tokenExistente) {
    tokenInicial = {
      validoAteISO: tokenExistente.validoAte.toISOString(),
      imagemDataUrl: await QRCode.toDataURL(tokenExistente.token, { margin: 1, width: 240 }),
    };
  }

  return (
    <main className="flex flex-1 flex-col items-center gap-6 p-8">
      <LinkVoltarPainel />
      <h1 className="text-2xl font-bold">O meu código QR</h1>
      <p className="max-w-sm text-center text-sm opacity-70">
        Mostra este código na portaria para entrar ou sair. É válido durante 2
        minutos e só pode ser usado uma vez.
      </p>
      <GeradorQR tokenInicial={tokenInicial} />
    </main>
  );
}
