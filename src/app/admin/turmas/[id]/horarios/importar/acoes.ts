"use server";

/**
 * Importação do horário de uma turma a partir de um ficheiro Excel (RF10 —
 * decisão do aluno). Duas Server Actions:
 *
 *  1. `analisarExcel` só LÊ o ficheiro e devolve uma pré-visualização —
 *     não grava nada. Assim a pessoa vê o que o site percebeu (e os erros)
 *     antes de qualquer coisa mudar a sério.
 *  2. `confirmarImportacao` recebe as linhas já analisadas (não volta a ler
 *     o ficheiro) e substitui o horário da turma pelas linhas sem erros —
 *     por isso pede a palavra-chave de confirmação, tal como editar ou
 *     remover um bloco à mão.
 */

import * as XLSX from "xlsx";
import { ligarBaseDados } from "@/lib/mongoose";
import { exigirPerfil } from "@/lib/permissoes";
import { Horario, Turma, Utilizador } from "@/models";
import { interpretarLinhasExcel, type LinhaImportada } from "@/lib/importarHorario";
import { passkeyValida, ERRO_PASSKEY } from "../../../../passkey";

export type ResultadoAnalise =
  | { ok: false; erro: string }
  | { ok: true; turmaNome: string; linhas: LinhaImportada[] };

/** Só lê e valida — não escreve nada na base de dados. */
export async function analisarExcel(turmaId: string, formData: FormData): Promise<ResultadoAnalise> {
  await exigirPerfil(["gestor", "admin"]);
  await ligarBaseDados();

  const turma = await Turma.findById(turmaId).select("nome").lean();
  if (!turma) {
    return { ok: false, erro: "Turma não encontrada." };
  }

  const ficheiro = formData.get("ficheiro");
  if (!(ficheiro instanceof File) || ficheiro.size === 0) {
    return { ok: false, erro: "Escolhe um ficheiro Excel (.xlsx)." };
  }

  let livro: XLSX.WorkBook;
  try {
    const bytes = await ficheiro.arrayBuffer();
    livro = XLSX.read(bytes, { type: "array" });
  } catch {
    return { ok: false, erro: "Não foi possível ler este ficheiro. Confirma que é um Excel válido." };
  }

  const nomeFolha = livro.SheetNames[0];
  if (!nomeFolha) {
    return { ok: false, erro: "O ficheiro não tem nenhuma folha." };
  }
  const folha = livro.Sheets[nomeFolha];
  const linhasBrutas = XLSX.utils.sheet_to_json<Record<string, unknown>>(folha, { defval: "" });

  if (linhasBrutas.length === 0) {
    return { ok: false, erro: "A folha não tem nenhuma linha de dados (só o cabeçalho, ou está vazia)." };
  }

  const professores = await Utilizador.find({ perfil: { $in: ["professor", "dt"] } })
    .select("nomeCompleto")
    .lean();
  const professoresDisponiveis = professores.map((p) => ({ id: p._id.toString(), nome: p.nomeCompleto }));

  const linhas = interpretarLinhasExcel(linhasBrutas, professoresDisponiveis);

  return { ok: true, turmaNome: turma.nome, linhas };
}

export type ResultadoImportacao = { ok: true; total: number } | { ok: false; erro: string };

/**
 * Substitui TODO o horário da turma pelas linhas dadas (só as que já não
 * têm erros — o formulário só deixa chegar aqui linhas válidas). Apaga os
 * blocos antigos e cria os novos como uma operação só, para nunca ficar a
 * meio (turma sem horário nenhum) se algo falhar a meio da importação.
 */
export async function confirmarImportacao(
  turmaId: string,
  linhas: LinhaImportada[],
  passkeyDigitada: string,
): Promise<ResultadoImportacao> {
  await exigirPerfil(["gestor", "admin"]);
  await ligarBaseDados();

  const formDataPasskey = new FormData();
  formDataPasskey.set("passkey", passkeyDigitada);
  if (!passkeyValida(formDataPasskey)) {
    return { ok: false, erro: ERRO_PASSKEY };
  }

  const turma = await Turma.findById(turmaId).lean();
  if (!turma) {
    return { ok: false, erro: "Turma não encontrada." };
  }

  const linhasValidas = linhas.filter((linha) => linha.erros.length === 0);
  if (linhasValidas.length === 0) {
    return { ok: false, erro: "Não há nenhuma linha válida para importar." };
  }

  // Transação (não usada mais nenhures neste projeto) de propósito aqui:
  // isto é um "substituir tudo" — sem isto, uma falha a meio (ex.: um erro
  // de rede a criar os novos blocos, já depois de apagar os antigos)
  // deixava a turma sem horário nenhum, pior do que antes de importar.
  const session = await Horario.startSession();
  try {
    await session.withTransaction(async () => {
      await Horario.deleteMany({ turmaId }, { session });
      await Horario.insertMany(
        linhasValidas.map((linha) => ({
          turmaId,
          diaSemana: linha.diaSemana,
          horaInicio: linha.horaInicio,
          horaFim: linha.horaFim,
          disciplina: linha.disciplina,
          professorId: linha.professorId,
          sala: linha.sala,
        })),
        { session },
      );
    });
  } catch (erro) {
    return {
      ok: false,
      erro: erro instanceof Error ? erro.message : "Não foi possível importar o horário.",
    };
  } finally {
    await session.endSession();
  }

  return { ok: true, total: linhasValidas.length };
}
