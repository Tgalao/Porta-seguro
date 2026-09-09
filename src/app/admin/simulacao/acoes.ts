"use server";

/**
 * Server Actions da ferramenta de simulação (só admin): aplica as MESMAS
 * regras da Fase 3 e a mesma lógica de movimento do Portão Teste real
 * (`src/lib/movimento.ts`), mas a uma data/hora escolhida à mão em vez da
 * hora verdadeira — para o aluno conseguir demonstrar na defesa oral
 * comportamentos que dependem da hora ou do dia da semana (atraso, saída à
 * hora de almoço, bloqueio de suspenso...) sem ter de esperar pelo momento
 * certo.
 *
 * Os registos criados aqui ficam com `metodo: "simulacao"` — nunca se
 * confundem com uma entrada/saída real, e são excluídos do cálculo de
 * assiduidade (RF07) em `src/app/consultas/logica.ts` e
 * `src/app/area-pessoal/page.tsx`.
 */

import { ligarBaseDados } from "@/lib/mongoose";
import { exigirPerfil } from "@/lib/permissoes";
import { horaLisboaParaUtc } from "@/lib/datas";
import { Utilizador } from "@/models";
import {
  processarMovimento,
  confirmarSaidaComPais as confirmarSaidaComPaisPartilhado,
  type ResultadoMovimento,
  type ResultadoConfirmacao,
} from "@/lib/movimento";

/**
 * Simula uma passagem pela portaria: `dataISO`/`horaISO` vêm de um
 * `<input type="date">` + `<input type="time">` (mais fácil de preencher do
 * que um único `datetime-local` em todos os navegadores), interpretados
 * como hora de Lisboa.
 */
export async function simularPassagem(
  alunoId: string,
  data: string,
  hora: string,
): Promise<ResultadoMovimento> {
  const sessao = await exigirPerfil(["admin"]);
  await ligarBaseDados();

  const aluno = await Utilizador.findOne({ _id: alunoId, perfil: "aluno" }).lean();
  if (!aluno) {
    return { ok: false, erro: "Aluno não encontrado." };
  }

  const momento = converterParaMomento(data, hora);
  if (!momento) {
    return { ok: false, erro: "Data ou hora inválida." };
  }

  return processarMovimento(aluno, sessao.user.id, "simulacao", momento);
}

/** Grava, na simulação, o resultado de "os pais autorizaram a saída?". */
export async function confirmarSaidaSimulada(
  alunoId: string,
  horarioId: string | undefined,
  momentoISO: string,
  paisAutorizaram: boolean,
): Promise<ResultadoConfirmacao> {
  const sessao = await exigirPerfil(["admin"]);
  return confirmarSaidaComPaisPartilhado(
    alunoId,
    horarioId,
    momentoISO,
    "simulacao",
    paisAutorizaram,
    sessao.user.id,
  );
}

function converterParaMomento(data: string, hora: string): Date | null {
  const encaixeData = /^(\d{4})-(\d{2})-(\d{2})$/.exec(data);
  const encaixeHora = /^(\d{2}):(\d{2})$/.exec(hora);
  if (!encaixeData || !encaixeHora) return null;

  const [, ano, mes, dia] = encaixeData;
  const [, horas, minutos] = encaixeHora;
  return horaLisboaParaUtc(Number(ano), Number(mes), Number(dia), Number(horas), Number(minutos));
}
