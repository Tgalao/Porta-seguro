"use server";

/**
 * Geração do código QR dinâmico (RF15), na área pessoal do aluno.
 */

import crypto from "node:crypto";
import QRCode from "qrcode";
import { ligarBaseDados } from "@/lib/mongoose";
import { exigirPerfil } from "@/lib/permissoes";
import { formatarHora } from "@/lib/datas";
import { TokenQR, Registo, Ocorrencia } from "@/models";

/** Validade do código, conforme o RF15. */
const VALIDADE_MS = 2 * 60 * 1000;

export interface TokenGerado {
  id: string;
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

  const tokenQR = await TokenQR.create({ alunoId: sessao.user.id, token, criadoEm, validoAte });

  const imagemDataUrl = await QRCode.toDataURL(token, { margin: 1, width: 240 });

  return { id: tokenQR._id.toString(), validoAteISO: validoAte.toISOString(), imagemDataUrl };
}

export type EstadoTokenQR =
  | { usado: false }
  | {
      usado: true;
      resultado: "aceite" | "recusado" | "pendente" | "identidade_rejeitada";
      motivo?: string;
      horaFormatada?: string;
    };

/**
 * Diz ao telemóvel do aluno o que aconteceu ao seu próprio código QR desde
 * que foi gerado — chamado em intervalos curtos enquanto o código está no
 * ecrã (ver `GeradorQR`).
 *
 * Sem isto, depois de o porteiro ler o código, o aluno continuava a ver a
 * imagem do QR (já inútil, porque é de uso único) sem saber que tinha sido
 * lido nem o que foi decidido — e nada impedia mostrar essa imagem, ainda
 * visível, a outra pessoa.
 */
export async function consultarEstadoTokenQR(idToken: string): Promise<EstadoTokenQR> {
  const sessao = await exigirPerfil(["aluno"]);
  await ligarBaseDados();

  // Filtrar por alunoId, não só pelo id do token: garante que ninguém
  // consegue espreitar o estado do código de outro aluno a adivinhar o id.
  const tokenQR = await TokenQR.findOne({ _id: idToken, alunoId: sessao.user.id }).lean();
  if (!tokenQR || !tokenQR.usado) {
    return { usado: false };
  }

  // O token fica marcado como usado assim que é lido (RF15: utilização
  // única), mas o que acontece a seguir demora um pouco mais: o porteiro
  // ainda tem de confirmar a identidade (RF16) e, numa saída fora do
  // horário, ainda pode ter de telefonar aos pais. Por isso procura-se o
  // que aconteceu DEPOIS da leitura, em vez de assumir que já terminou.
  const desde = tokenQR.usadoEm ?? tokenQR.validoAte;
  const [ocorrenciaRejeitada, registo] = await Promise.all([
    Ocorrencia.findOne({
      alunoId: sessao.user.id,
      tipo: "qr_aluno_diferente",
      dataHora: { $gte: desde },
    }).lean(),
    Registo.findOne({ alunoId: sessao.user.id, metodo: "qr", dataHora: { $gte: desde } })
      .sort({ dataHora: 1 })
      .lean(),
  ]);

  if (ocorrenciaRejeitada) {
    return { usado: true, resultado: "identidade_rejeitada" };
  }

  if (registo) {
    const aceite = registo.estado === "autorizado" || registo.estado === "confirmado_pais";
    return {
      usado: true,
      resultado: aceite ? "aceite" : "recusado",
      motivo: registo.motivo,
      horaFormatada: formatarHora(registo.dataHora),
    };
  }

  // Usado, mas ainda sem registo nem rejeição: o porteiro está a meio do
  // fluxo (ex.: a ligar aos pais numa saída fora do horário).
  return { usado: true, resultado: "pendente" };
}
