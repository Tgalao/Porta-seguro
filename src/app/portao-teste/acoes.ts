"use server";

/**
 * Server Actions do ecrã da portaria (UC01 — Registar entrada/saída de
 * aluno). Identificação só por código QR (decisão do aluno: a simulação de
 * cartão físico saiu do Portão Teste). O fluxo tem até três passos:
 *
 *   1. `lerCodigoQR` lê o código: confirma que é válido, ainda não foi
 *      usado, está dentro do minuto de validade e serve para a direção
 *      certa (ver RF15 abaixo). O código só fica marcado como usado e o
 *      aluno só é mostrado ao porteiro para CONFIRMAÇÃO VISUAL — o sistema
 *      não tem forma automática de saber se quem apresenta o telemóvel é
 *      mesmo o dono do código (não há segundo fator); por isso o campo
 *      `fotoUrl` foi acrescentado ao modelo Utilizador logo na Fase 1, para
 *      o porteiro poder comparar com a pessoa à frente. Essa confirmação é
 *      dada a `confirmarIdentidadeQR`.
 *   2. Depois de a identidade confirmada, `processarIdentificacao` aplica
 *      as regras da Fase 3. Entradas e saídas autorizadas ficam logo
 *      gravadas. Só a saída NÃO autorizada fica pendente — nesse caso não
 *      se grava nada ainda, porque o 2.º fluxograma do UC01 exige primeiro
 *      que o porteiro contacte os pais.
 *   3. `confirmarSaidaComPais` grava o resultado desse contacto telefónico
 *      (o programa nunca liga para ninguém sozinho — RF04).
 *
 * RF15 (decisão do aluno): um código QR só é válido durante 1 minuto, só
 * pode ser usado uma vez, e fica bloqueado à direção (entrada OU saída)
 * decidida no momento em que foi gerado — ver `proximoTipoRegisto` e
 * `validarTokenQR`. Gerar um código para entrar e tentar usá-lo para sair
 * (ou o inverso) é recusado.
 */

import { ligarBaseDados } from "@/lib/mongoose";
import { exigirPerfil } from "@/lib/permissoes";
import { formatarHora, diaDaSemanaEmLisboa } from "@/lib/datas";
import { Utilizador, Turma, Horario, Registo, Ocorrencia, TokenQR } from "@/models";
import type { IUtilizador } from "@/models";
import {
  decidirEntrada,
  decidirSaida,
  validarTokenQR,
  calcularEstadoPorta,
  proximoTipoRegisto,
  type ResultadoEstadoPorta,
} from "@/lib/regras";
import { notificarMovimento } from "@/lib/notificacoes";
import type { BlocoHorario } from "@/components/horario-semanal";
import type { IHorario } from "@/models";
import type { TipoRegisto, EstadoRegisto } from "@/lib/constantes";

export interface AlunoResumo {
  id: string;
  nome: string;
  fotoUrl?: string;
  numeroAluno?: number;
  turma?: string;
  /**
   * Blocos de HOJE e estado da porta, para o porteiro perceber num relance
   * se aquela pessoa devia estar ali àquela hora. Não inclui assiduidade:
   * o histórico de faltas não é da conta do porteiro — o aluno consulta o
   * seu na área pessoal.
   *
   * O "hoje" é decidido aqui, no servidor, com o dia da semana em Lisboa —
   * no browser, `new Date().getDay()` daria o dia do fuso do próprio
   * computador, que pode não ser o nosso.
   */
  blocosHoje?: BlocoHorario[];
  estadoPorta?: ResultadoEstadoPorta;
}

/** Uma linha da tabela "registos de hoje". */
export interface LinhaRegisto {
  id: string;
  alunoNome: string;
  tipo: TipoRegisto;
  estado: EstadoRegisto;
  horaFormatada: string;
}

export type ResultadoIdentificacao =
  | { ok: false; erro: string }
  | {
      ok: true;
      pendente: false;
      aluno: AlunoResumo;
      autorizado: boolean;
      motivo: string;
      linha: LinhaRegisto;
    }
  | {
      ok: true;
      pendente: true;
      aluno: AlunoResumo;
      motivo: string;
      horarioId?: string;
      momentoISO: string;
    };

type AlunoParaMovimento = Pick<
  IUtilizador,
  | "_id"
  | "nomeCompleto"
  | "email"
  | "fotoUrl"
  | "numeroAluno"
  | "turmaId"
  | "maiorIdade"
  | "autorizacaoPais"
  | "suspenso"
>;

/**
 * Qualquer movimento registado torna obsoleto um código QR que a pessoa
 * ainda tenha por usar: refletia uma intenção de entrada/saída que já
 * deixou de fazer sentido depois deste movimento.
 *
 * Mesma ideia (e quase o mesmo código) de `gerarNovoTokenQR`: gerar um
 * código novo já invalidava os anteriores; isto invalida-os também quando
 * o movimento acaba por se concretizar.
 */
async function invalidarTokenQRPendente(alunoId: IUtilizador["_id"], momento: Date): Promise<void> {
  await TokenQR.updateMany({ alunoId, usado: false }, { usado: true, usadoEm: momento });
}

function resumoDoAluno(
  aluno: AlunoParaMovimento,
  nomeTurma?: string,
  horarios?: IHorario[],
  momento?: Date,
): AlunoResumo {
  return {
    id: aluno._id.toString(),
    nome: aluno.nomeCompleto,
    fotoUrl: aluno.fotoUrl,
    numeroAluno: aluno.numeroAluno,
    turma: nomeTurma,
    blocosHoje:
      horarios && momento
        ? horarios
            .filter((h) => h.diaSemana === diaDaSemanaEmLisboa(momento))
            .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio))
            .map((h) => ({
              diaSemana: h.diaSemana,
              horaInicio: h.horaInicio,
              horaFim: h.horaFim,
              disciplina: h.disciplina,
              sala: h.sala,
            }))
        : undefined,
    estadoPorta:
      horarios && momento ? calcularEstadoPorta(horarios, momento) : undefined,
  };
}

/**
 * Aplica as regras da Fase 3 depois de o aluno já estar identificado (QR
 * lido + identidade confirmada pelo porteiro).
 */
async function processarIdentificacao(
  aluno: AlunoParaMovimento,
  registadoPorId: string,
): Promise<ResultadoIdentificacao> {
  const turma = aluno.turmaId ? await Turma.findById(aluno.turmaId).lean() : null;
  const horarios = aluno.turmaId
    ? await Horario.find({ turmaId: aluno.turmaId }).lean()
    : [];

  const momento = new Date();
  const resumo = resumoDoAluno(aluno, turma?.nome, horarios, momento);

  // O tipo de movimento não é escolhido pelo porteiro: alterna com o
  // último registo do aluno (mesma regra usada para bloquear a direção do
  // QR na geração — ver `proximoTipoRegisto`).
  const ultimoRegisto = await Registo.findOne({ alunoId: aluno._id })
    .sort({ dataHora: -1 })
    .lean();
  const tipo = proximoTipoRegisto(ultimoRegisto?.tipo);

  if (tipo === "entrada") {
    const decisao = decidirEntrada({ suspenso: aluno.suspenso }, horarios, momento);

    const registo = await Registo.create({
      alunoId: aluno._id,
      dataHora: momento,
      tipo: "entrada",
      metodo: "qr",
      estado: decisao.autorizado ? "autorizado" : "nao_autorizado",
      motivo: decisao.motivo,
      horarioId: decisao.horarioId,
      registadoPorId,
    });

    if (decisao.criarOcorrencia) {
      await Ocorrencia.create({
        alunoId: aluno._id,
        tipo: "entrada_suspenso",
        descricao: "Tentativa de entrada de aluno suspenso.",
        registoId: registo._id,
      });
    }

    await Promise.all([
      notificarMovimento(
        aluno.nomeCompleto,
        aluno.email,
        "entrada",
        decisao.autorizado,
        decisao.motivo,
        momento,
      ),
      invalidarTokenQRPendente(aluno._id, momento),
    ]);

    return {
      ok: true,
      pendente: false,
      aluno: resumo,
      autorizado: decisao.autorizado,
      motivo: decisao.motivo,
      linha: {
        id: registo._id.toString(),
        alunoNome: resumo.nome,
        tipo: "entrada",
        estado: registo.estado,
        horaFormatada: formatarHora(momento),
      },
    };
  }

  const decisao = decidirSaida(
    { maiorIdade: aluno.maiorIdade, autorizacaoPais: aluno.autorizacaoPais },
    horarios,
    momento,
  );

  if (!decisao.autorizado) {
    return {
      ok: true,
      pendente: true,
      aluno: resumo,
      motivo: decisao.motivo,
      horarioId: decisao.horarioId?.toString(),
      momentoISO: momento.toISOString(),
    };
  }

  const registo = await Registo.create({
    alunoId: aluno._id,
    dataHora: momento,
    tipo: "saida",
    metodo: "qr",
    estado: "autorizado",
    motivo: decisao.motivo,
    horarioId: decisao.horarioId,
    registadoPorId,
  });

  await Promise.all([
    notificarMovimento(aluno.nomeCompleto, aluno.email, "saida", true, decisao.motivo, momento),
    invalidarTokenQRPendente(aluno._id, momento),
  ]);

  return {
    ok: true,
    pendente: false,
    aluno: resumo,
    autorizado: true,
    motivo: decisao.motivo,
    linha: {
      id: registo._id.toString(),
      alunoNome: resumo.nome,
      tipo: "saida",
      estado: "autorizado",
      horaFormatada: formatarHora(momento),
    },
  };
}

export type ResultadoConfirmacao =
  | { ok: false; erro: string }
  | { ok: true; autorizado: boolean; linha: LinhaRegisto };

/** Grava a saída pendente depois de o porteiro contactar os pais (RF04). */
export async function confirmarSaidaComPais(
  alunoId: string,
  horarioId: string | undefined,
  momentoISO: string,
  paisAutorizaram: boolean,
): Promise<ResultadoConfirmacao> {
  const sessao = await exigirPerfil(["porteiro", "admin"]);
  await ligarBaseDados();

  const aluno = await Utilizador.findById(alunoId).lean();
  if (!aluno) {
    return { ok: false, erro: "Aluno já não existe." };
  }

  const momento = new Date(momentoISO);
  const motivo = paisAutorizaram
    ? "Saída fora do horário confirmada por telefone com os pais."
    : "Pais contactados; saída não autorizada.";

  const registo = await Registo.create({
    alunoId: aluno._id,
    dataHora: momento,
    tipo: "saida",
    metodo: "qr",
    estado: paisAutorizaram ? "confirmado_pais" : "nao_autorizado",
    motivo,
    horarioId,
    registadoPorId: sessao.user.id,
    confirmacaoPais: paisAutorizaram,
  });

  await Promise.all([
    notificarMovimento(aluno.nomeCompleto, aluno.email, "saida", paisAutorizaram, motivo, momento),
    invalidarTokenQRPendente(aluno._id, momento),
  ]);

  return {
    ok: true,
    autorizado: paisAutorizaram,
    linha: {
      id: registo._id.toString(),
      alunoNome: aluno.nomeCompleto,
      tipo: "saida",
      estado: registo.estado,
      horaFormatada: formatarHora(momento),
    },
  };
}

export type ResultadoLeituraQR =
  | { ok: false; erro: string }
  | { ok: true; confirmarIdentidade: true; aluno: AlunoResumo };

/**
 * Lê um código QR (RF15). Se for válido, NÃO regista logo o movimento —
 * primeiro pede ao porteiro que confirme visualmente que a pessoa à frente
 * é o aluno da foto (ver explicação no topo do ficheiro).
 */
export async function lerCodigoQR(token: string): Promise<ResultadoLeituraQR> {
  await exigirPerfil(["porteiro", "admin"]);
  await ligarBaseDados();

  const tokenQR = await TokenQR.findOne({ token: token.trim() }).lean();
  if (!tokenQR) {
    return { ok: false, erro: "Código QR não reconhecido." };
  }

  const momento = new Date();

  // A direção esperada é calculada com a MESMA regra usada quando o código
  // foi gerado — se o aluno já teve outro movimento entretanto, deixa de
  // bater certo com `tokenQR.tipo`, e é isso que `validarTokenQR` recusa.
  const ultimoRegisto = await Registo.findOne({ alunoId: tokenQR.alunoId })
    .sort({ dataHora: -1 })
    .lean();
  const tipoEsperado = proximoTipoRegisto(ultimoRegisto?.tipo);

  // `alunoIdQueApresenta` é sempre o dono do token: não há, neste ecrã,
  // nenhuma segunda fonte que diga quem está fisicamente a apresentá-lo —
  // essa verificação é feita a seguir, visualmente, pelo porteiro.
  const validacao = validarTokenQR(tokenQR, tokenQR.alunoId, tipoEsperado, momento);

  if (!validacao.valido) {
    await Ocorrencia.create({
      alunoId: tokenQR.alunoId,
      tipo: `qr_${validacao.motivo}`,
      descricao: `Tentativa de utilizar um código QR ${validacao.motivo.replace("_", " ")}.`,
    });

    const mensagem =
      validacao.motivo === "tipo_incorreto"
        ? `Este código só serve para ${tokenQR.tipo === "entrada" ? "entrar" : "sair"}.`
        : MENSAGENS_QR_INVALIDO[validacao.motivo];
    return { ok: false, erro: mensagem };
  }

  // Utilização única (RF15): marca-se como usado já aqui, mesmo que o
  // porteiro venha a rejeitar a identidade a seguir — o código, uma vez
  // lido, não pode voltar a ser tentado.
  await TokenQR.updateOne({ _id: tokenQR._id }, { usado: true, usadoEm: momento });

  const aluno = await Utilizador.findById(tokenQR.alunoId).lean();
  if (!aluno) {
    return { ok: false, erro: "O aluno deste código já não existe." };
  }

  // Além da foto e do nome, o porteiro recebe o horário da turma e o estado
  // da porta — é o que lhe permite decidir se aquela pessoa devia mesmo
  // estar ali àquela hora, sem lhe dar acesso ao histórico de faltas.
  const [turma, horarios] = await Promise.all([
    aluno.turmaId ? Turma.findById(aluno.turmaId).lean() : null,
    aluno.turmaId ? Horario.find({ turmaId: aluno.turmaId }).lean() : [],
  ]);

  return {
    ok: true,
    confirmarIdentidade: true,
    aluno: resumoDoAluno(aluno, turma?.nome, horarios, momento),
  };
}

const MENSAGENS_QR_INVALIDO = {
  aluno_diferente: "Este código QR não pertence a este aluno.",
  ja_utilizado: "Este código QR já foi utilizado.",
  expirado: "Este código QR já expirou.",
} as const;

export type ResultadoConfirmacaoIdentidade =
  | { ok: false; erro: string }
  | { ok: true; identidadeRejeitada: true; aluno: AlunoResumo; motivo: string }
  | ResultadoIdentificacao;

/**
 * Grava a resposta do porteiro à pergunta "é esta a pessoa?" (RF16). Se
 * não for, só fica a ocorrência — não há nenhum movimento a decidir nem
 * registo a criar (ninguém entrou nem saiu).
 */
export async function confirmarIdentidadeQR(
  alunoId: string,
  eEsteAluno: boolean,
): Promise<ResultadoConfirmacaoIdentidade> {
  const sessao = await exigirPerfil(["porteiro", "admin"]);
  await ligarBaseDados();

  const aluno = await Utilizador.findById(alunoId).lean();
  if (!aluno) {
    return { ok: false, erro: "Aluno já não existe." };
  }

  if (!eEsteAluno) {
    await Ocorrencia.create({
      alunoId: aluno._id,
      tipo: "qr_aluno_diferente",
      descricao: "Porteiro confirmou que a pessoa presente não é o aluno do código QR.",
    });
    return {
      ok: true,
      identidadeRejeitada: true,
      aluno: resumoDoAluno(aluno),
      motivo: "Código QR não corresponde a quem se apresentou.",
    };
  }

  return processarIdentificacao(aluno, sessao.user.id);
}
