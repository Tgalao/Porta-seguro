"use server";

/**
 * Server Actions do ecrã da portaria (UC01 — Registar entrada/saída de
 * aluno). Duas ações, porque o fluxo tem dois passos possíveis:
 *
 *   1. `registarEntradaOuSaida` identifica o aluno pelo cartão, decide o
 *      tipo de movimento (alterna com o último registo do aluno) e aplica
 *      as regras da Fase 3. Entradas e saídas autorizadas ficam logo
 *      gravadas. Só a saída NÃO autorizada fica pendente — nesse caso não
 *      se grava nada ainda, porque o 2.º fluxograma do UC01 exige primeiro
 *      que o porteiro contacte os pais.
 *   2. `confirmarSaidaComPais` grava o resultado desse contacto telefónico
 *      (o programa nunca liga para ninguém sozinho — RF04).
 */

import { ligarBaseDados } from "@/lib/mongoose";
import { exigirPerfil } from "@/lib/permissoes";
import { formatarHora } from "@/lib/datas";
import { Utilizador, Turma, Horario, Registo, Ocorrencia } from "@/models";
import { decidirEntrada, decidirSaida } from "@/lib/regras";
import type { TipoRegisto, EstadoRegisto, MetodoRegisto } from "@/lib/constantes";

export interface AlunoResumo {
  id: string;
  nome: string;
  fotoUrl?: string;
  numeroAluno?: number;
  turma?: string;
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

/**
 * Identifica o aluno pelo número do cartão e regista o movimento — exceto
 * quando é uma saída não autorizada, caso em que devolve `pendente: true`
 * sem gravar nada.
 */
export async function registarEntradaOuSaida(
  numeroCartao: string,
): Promise<ResultadoIdentificacao> {
  const sessao = await exigirPerfil(["porteiro", "admin"]);
  await ligarBaseDados();

  const cartao = numeroCartao.trim();
  if (!cartao) {
    return { ok: false, erro: "Introduz o número do cartão." };
  }

  const aluno = await Utilizador.findOne({
    numeroCartao: cartao,
    perfil: "aluno",
  }).lean();

  if (!aluno) {
    return { ok: false, erro: "Cartão não reconhecido." };
  }

  const turma = aluno.turmaId ? await Turma.findById(aluno.turmaId).lean() : null;
  const horarios = aluno.turmaId
    ? await Horario.find({ turmaId: aluno.turmaId }).lean()
    : [];

  const resumo: AlunoResumo = {
    id: aluno._id.toString(),
    nome: aluno.nomeCompleto,
    fotoUrl: aluno.fotoUrl,
    numeroAluno: aluno.numeroAluno,
    turma: turma?.nome,
  };

  // O tipo de movimento não é escolhido pelo porteiro: alterna com o
  // último registo do aluno (se o último foi entrada, agora só pode ser
  // saída, e vice-versa; sem registos anteriores, é sempre entrada).
  const ultimoRegisto = await Registo.findOne({ alunoId: aluno._id })
    .sort({ dataHora: -1 })
    .lean();
  const tipo: TipoRegisto = ultimoRegisto?.tipo === "entrada" ? "saida" : "entrada";

  const momento = new Date();

  if (tipo === "entrada") {
    const decisao = decidirEntrada({ suspenso: aluno.suspenso }, horarios, momento);

    const registo = await Registo.create({
      alunoId: aluno._id,
      dataHora: momento,
      tipo: "entrada",
      metodo: "cartao",
      estado: decisao.autorizado ? "autorizado" : "nao_autorizado",
      motivo: decisao.motivo,
      horarioId: decisao.horarioId,
      registadoPorId: sessao.user.id,
    });

    if (decisao.criarOcorrencia) {
      await Ocorrencia.create({
        alunoId: aluno._id,
        tipo: "entrada_suspenso",
        descricao: "Tentativa de entrada de aluno suspenso.",
        registoId: registo._id,
      });
    }

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
        metodo: "cartao",
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
    metodo: "cartao",
    estado: "autorizado",
    motivo: decisao.motivo,
    horarioId: decisao.horarioId,
    registadoPorId: sessao.user.id,
  });

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
      metodo: "cartao",
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

  const registo = await Registo.create({
    alunoId: aluno._id,
    dataHora: momento,
    tipo: "saida",
    metodo: "cartao",
    estado: paisAutorizaram ? "confirmado_pais" : "nao_autorizado",
    motivo: paisAutorizaram
      ? "Saída fora do horário confirmada por telefone com os pais."
      : "Pais contactados; saída não autorizada.",
    horarioId,
    registadoPorId: sessao.user.id,
    confirmacaoPais: paisAutorizaram,
  });

  return {
    ok: true,
    autorizado: paisAutorizaram,
    linha: {
      id: registo._id.toString(),
      alunoNome: aluno.nomeCompleto,
      tipo: "saida",
      estado: registo.estado,
      metodo: "cartao",
      horaFormatada: formatarHora(momento),
    },
  };
}
