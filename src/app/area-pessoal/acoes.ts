"use server";

/**
 * Geração do código QR dinâmico (RF15), na área pessoal do aluno.
 */

import crypto from "node:crypto";
import QRCode from "qrcode";
import { ligarBaseDados } from "@/lib/mongoose";
import { exigirPerfil } from "@/lib/permissoes";
import { TokenQR } from "@/models";

/** Validade do código, conforme o RF15. */
const VALIDADE_MS = 2 * 60 * 1000;

export interface TokenGerado {
  validoAteISO: string;
  imagemDataUrl: string;
}

/**
 * Gera um código novo, invalidando qualquer código anterior ainda não
 * usado — só pode existir um código válido por aluno de cada vez.
 */
export async function gerarNovoTokenQR(): Promise<TokenGerado> {
  const sessao = await exigirPerfil(["aluno"]);
  await ligarBaseDados();

  await TokenQR.updateMany(
    { alunoId: sessao.user.id, usado: false },
    { usado: true, usadoEm: new Date() },
  );

  // Aleatório e imprevisível — não dá para adivinhar o código de outro
  // aluno a tentar valores ao acaso.
  const token = crypto.randomBytes(24).toString("base64url");
  const criadoEm = new Date();
  const validoAte = new Date(criadoEm.getTime() + VALIDADE_MS);

  await TokenQR.create({ alunoId: sessao.user.id, token, criadoEm, validoAte });

  const imagemDataUrl = await QRCode.toDataURL(token, { margin: 1, width: 240 });

  return { validoAteISO: validoAte.toISOString(), imagemDataUrl };
}
