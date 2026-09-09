/**
 * Lógica partilhada de "processar um movimento" (entrada ou saída),
 * usada por dois pontos de entrada diferentes:
 *
 *  - `/portao-teste` (RF15): identificação real por código QR, sempre com
 *    a hora verdadeira do momento em que o porteiro lê o código.
 *  - `/admin/simulacao`: ferramenta só para o admin, que aplica as MESMAS
 *    regras da Fase 3 a uma data/hora escolhida à mão — para conseguir
 *    demonstrar/testar comportamentos (atraso, saída à hora de almoço,
 *    bloqueio de suspenso...) sem ter de esperar pelo dia e à hora certa.
 *
 * Este ficheiro não é "use server" — não é ele próprio uma Server Action,
 * é uma função partilhada CHAMADA por Server Actions. A verificação de
 * quem pode chamar isto (`exigirPerfil`) fica sempre do lado de quem
 * chama, nunca aqui: o Portão Teste deixa entrar porteiro e admin, a
 * simulação só admin, e essa decisão não pertence a uma peça partilhada.
 */

import { ligarBaseDados } from "@/lib/mongoose";
import { formatarHora, diaDaSemanaEmLisboa } from "@/lib/datas";
import { Utilizador, Turma, Horario, Registo, Ocorrencia, TokenQR } from "@/models";
import type { IUtilizador, IHorario } from "@/models";
import {
  decidirEntrada,
  decidirSaida,
  calcularEstadoPorta,
  proximoTipoRegisto,
  type ResultadoEstadoPorta,
} from "@/lib/regras";
import { notificarMovimento } from "@/lib/notificacoes";
import type { BlocoHorario } from "@/components/horario-semanal";
import type { TipoRegisto, EstadoRegisto, MetodoRegisto } from "@/lib/constantes";

export interface AlunoResumo {
  id: string;
  nome: string;
  fotoUrl?: string;
  numeroAluno?: number;
  turma?: string;
  /**
   * Blocos do dia simulado/real e estado da porta, para quem está a
   * identificar perceber num relance se aquela pessoa devia estar ali
   * àquela hora. Não inclui assiduidade: o histórico de faltas não é da
   * conta do porteiro — o aluno consulta o seu na área pessoal.
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
  metodo: MetodoRegisto;
  horaFormatada: string;
}

export type ResultadoMovimento =
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

export type AlunoParaMovimento = Pick<
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
 * deixou de fazer sentido depois deste movimento — incluindo um movimento
 * simulado pelo admin, que devia "contar" tal como um real para não
 * deixar código QR nenhum válido a apontar para um estado que já mudou.
 */
async function invalidarTokenQRPendente(alunoId: IUtilizador["_id"], momento: Date): Promise<void> {
  await TokenQR.updateMany({ alunoId, usado: false }, { usado: true, usadoEm: momento });
}

export function resumoDoAluno(
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
 * Aplica as regras da Fase 3 para um aluno já identificado, num momento
 * escolhido por quem chama — a hora verdadeira no caso do QR, uma hora
 * escolhida à mão no caso da simulação.
 */
export async function processarMovimento(
  aluno: AlunoParaMovimento,
  registadoPorId: string,
  metodo: MetodoRegisto,
  momento: Date,
): Promise<ResultadoMovimento> {
  await ligarBaseDados();

  const turma = aluno.turmaId ? await Turma.findById(aluno.turmaId).lean() : null;
  const horarios = aluno.turmaId
    ? await Horario.find({ turmaId: aluno.turmaId }).lean()
    : [];

  const resumo = resumoDoAluno(aluno, turma?.nome, horarios, momento);

  // O tipo de movimento não é escolhido por quem identifica: alterna com
  // o último registo ANTES deste momento (mesma regra usada para bloquear
  // a direção do QR na geração — ver `proximoTipoRegisto`). Isto conta os
  // registos simulados tal como os reais, de propósito: se se simula uma
  // entrada, o próximo movimento — real ou simulado — só pode ser uma
  // saída, exatamente como aconteceria no dia a dia.
  //
  // O filtro `dataHora < momento` é essencial para a simulação: no
  // caminho real (QR), `momento` é sempre "agora", por isso já não havia
  // nenhum registo com data posterior — mas a simulação pode escolher uma
  // hora do passado, e sem este filtro o "último" registo encontrado seria
  // o mais recente de SEMPRE (por exemplo, de um movimento real de hoje já
  // ocorrido depois da hora escolhida), não o último antes do momento que
  // se está a simular.
  const ultimoRegisto = await Registo.findOne({ alunoId: aluno._id, dataHora: { $lt: momento } })
    .sort({ dataHora: -1 })
    .lean();
  const tipo = proximoTipoRegisto(ultimoRegisto?.tipo);

  if (tipo === "entrada") {
    const decisao = decidirEntrada({ suspenso: aluno.suspenso }, horarios, momento);

    const registo = await Registo.create({
      alunoId: aluno._id,
      dataHora: momento,
      tipo: "entrada",
      metodo,
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
        metodo,
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
    metodo,
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
      metodo,
      horaFormatada: formatarHora(momento),
    },
  };
}

export type ResultadoConfirmacao =
  | { ok: false; erro: string }
  | { ok: true; autorizado: boolean; linha: LinhaRegisto };

/** Grava a saída pendente depois de (na simulação: "como se") alguém
 * tivesse contactado os pais (RF04). */
export async function confirmarSaidaComPais(
  alunoId: string,
  horarioId: string | undefined,
  momentoISO: string,
  metodo: MetodoRegisto,
  paisAutorizaram: boolean,
  registadoPorId: string,
): Promise<ResultadoConfirmacao> {
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
    metodo,
    estado: paisAutorizaram ? "confirmado_pais" : "nao_autorizado",
    motivo,
    horarioId,
    registadoPorId,
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
      metodo,
      horaFormatada: formatarHora(momento),
    },
  };
}
