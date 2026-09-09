"use server";

/**
 * Geração do código QR dinâmico (RF15), na área pessoal do aluno.
 */

import crypto from "node:crypto";
import { headers } from "next/headers";
import QRCode from "qrcode";
import { ligarBaseDados } from "@/lib/mongoose";
import { exigirPerfil } from "@/lib/permissoes";
import { formatarHora, formatarDataHora, horaLisboaParaUtc } from "@/lib/datas";
import { ehUserAgentDeTelemovel, EMAIL_CONTA_DE_TESTE_QR } from "@/lib/dispositivo";
import { TokenQR, Registo, Ocorrencia } from "@/models";
import { proximoTipoRegisto } from "@/lib/regras";
import type { TipoRegisto } from "@/lib/constantes";

/** Validade do código, conforme o RF15 (decisão do aluno: 1 minuto). */
const VALIDADE_MS = 1 * 60 * 1000;

export interface TokenGerado {
  id: string;
  validoAteISO: string;
  imagemDataUrl: string;
  /** Direção com que este código foi gerado — mostrada ao aluno para não
   * haver dúvida de que só serve para entrar OU só para sair. */
  tipo: TipoRegisto;
  /** Só preenchido para a conta de teste, quando pede uma hora simulada —
   * mostrado como aviso, para nunca se confundir com um código real. */
  momentoSimuladoFormatado?: string;
}

export type ResultadoGeracaoQR =
  | { ok: true; token: TokenGerado }
  | { ok: false; erro: string };

/**
 * Gera um código novo, invalidando qualquer código anterior ainda não
 * usado — só pode existir um código válido por aluno de cada vez.
 *
 * A direção (`tipo`) fica decidida já aqui, com a mesma regra de
 * alternância da portaria — e é EXIGIDA na leitura (`validarTokenQR`): um
 * código gerado para entrar nunca serve para sair, mesmo que o estado do
 * aluno mude entretanto.
 *
 * Restrito ao telemóvel (decisão do aluno): o código destina-se a ser
 * mostrado na portaria a partir do telemóvel de quem o gera, não gerado
 * num PC e fotografado ou reencaminhado. Verificado aqui no servidor (não
 * só escondendo o botão no ecrã) porque a Server Action é chamável
 * diretamente, sem passar pela interface. A conta de teste
 * `5802@eclisboa.net` fica isenta, para permitir demonstrar isto sem
 * telemóvel na defesa oral.
 *
 * Essa mesma conta pode ainda escolher `dataSimulada`/`horaSimulada`: a
 * decisão de entrada/saída (feita mais tarde, quando o porteiro lê o
 * código) passa a usar essa data/hora em vez do momento real da leitura —
 * para dar para demonstrar a entrada por QR em qualquer dia/hora sem
 * esperar pelo momento certo. A validade do próprio código continua real
 * (1 minuto a partir de agora), para se manter mesmo scanável.
 */
export async function gerarNovoTokenQR(
  dataSimulada?: string,
  horaSimulada?: string,
): Promise<ResultadoGeracaoQR> {
  const sessao = await exigirPerfil(["aluno"]);
  const ehContaDeTeste = sessao.user.email === EMAIL_CONTA_DE_TESTE_QR;

  const userAgent = (await headers()).get("user-agent");
  if (!ehUserAgentDeTelemovel(userAgent) && !ehContaDeTeste) {
    return {
      ok: false,
      erro: "Este código só pode ser gerado a partir do telemóvel. Abre a tua área pessoal no telemóvel para gerares o código QR.",
    };
  }

  const momentoSimulado =
    ehContaDeTeste && dataSimulada && horaSimulada
      ? converterParaMomento(dataSimulada, horaSimulada)
      : null;

  await ligarBaseDados();

  // Ao decidir a direção (entrada/saída), o "último registo" tem de ser o
  // último ANTES do momento a usar — real, ou simulado quando escolhido.
  // Sem este filtro, um momento simulado no passado ignorava-o e olhava
  // sempre para o registo mais recente de sempre (mesmo bug já corrigido
  // na simulação do admin — ver src/lib/movimento.ts).
  const momentoParaDecisao = momentoSimulado ?? new Date();
  const [, ultimoRegisto] = await Promise.all([
    TokenQR.updateMany(
      { alunoId: sessao.user.id, usado: false },
      { usado: true, usadoEm: new Date() },
    ),
    Registo.findOne({ alunoId: sessao.user.id, dataHora: { $lt: momentoParaDecisao } })
      .sort({ dataHora: -1 })
      .lean(),
  ]);
  const tipo = proximoTipoRegisto(ultimoRegisto?.tipo);

  // Aleatório e imprevisível — não dá para adivinhar o código de outro
  // aluno a tentar valores ao acaso.
  const token = crypto.randomBytes(24).toString("base64url");
  const criadoEm = new Date();
  const validoAte = new Date(criadoEm.getTime() + VALIDADE_MS);

  const tokenQR = await TokenQR.create({
    alunoId: sessao.user.id,
    token,
    criadoEm,
    validoAte,
    tipo,
    momentoSimulado: momentoSimulado ?? undefined,
  });

  const imagemDataUrl = await QRCode.toDataURL(token, { margin: 1, width: 240 });

  return {
    ok: true,
    token: {
      id: tokenQR._id.toString(),
      validoAteISO: validoAte.toISOString(),
      imagemDataUrl,
      tipo,
      momentoSimuladoFormatado: momentoSimulado ? formatarDataHora(momentoSimulado) : undefined,
    },
  };
}

function converterParaMomento(data: string, hora: string): Date | null {
  const encaixeData = /^(\d{4})-(\d{2})-(\d{2})$/.exec(data);
  const encaixeHora = /^(\d{2}):(\d{2})$/.exec(hora);
  if (!encaixeData || !encaixeHora) return null;

  const [, ano, mes, dia] = encaixeData;
  const [, horas, minutos] = encaixeHora;
  return horaLisboaParaUtc(Number(ano), Number(mes), Number(dia), Number(horas), Number(minutos));
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

  // O token fica marcado como usado em duas situações: foi lido na portaria
  // (RF15), ou ficou obsoleto porque a pessoa já teve outro movimento
  // registado enquanto o código ainda estava por usar (ver
  // `invalidarTokenQRPendente` em src/app/portao-teste/acoes.ts).
  //
  // Nota: uma rejeição por "direção errada" (código gerado para entrar
  // apresentado para sair, ou vice-versa) NÃO passa por aqui — não marca o
  // token como usado, de propósito, tal como já acontecia com "aluno
  // diferente" e "expirado": um código só é considerado gasto quando é
  // mesmo aceite, não em qualquer tentativa falhada. O porteiro vê o erro
  // no próprio ecrã; o código continua válido para a pessoa tentar outra
  // vez na direção certa.
  //
  // Também não assume que já terminou logo que fica marcado como usado: o
  // porteiro ainda pode ter de confirmar a identidade (RF16) ou telefonar
  // aos pais, e isso demora mais um pouco.
  const desde = tokenQR.usadoEm ?? tokenQR.validoAte;
  const [ocorrenciaRejeitada, registo] = await Promise.all([
    Ocorrencia.findOne({
      alunoId: sessao.user.id,
      tipo: "qr_aluno_diferente",
      dataHora: { $gte: desde },
    }).lean(),
    Registo.findOne({ alunoId: sessao.user.id, dataHora: { $gte: desde } })
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
