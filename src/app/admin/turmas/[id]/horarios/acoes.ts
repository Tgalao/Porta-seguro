"use server";

import { redirect } from "next/navigation";
import { ligarBaseDados } from "@/lib/mongoose";
import { exigirPerfil } from "@/lib/permissoes";
import { Horario } from "@/models";

function lerCampos(formData: FormData) {
  return {
    turmaId: String(formData.get("turmaId") ?? "").trim(),
    diaSemana: Number(formData.get("diaSemana")),
    horaInicio: String(formData.get("horaInicio") ?? "").trim(),
    horaFim: String(formData.get("horaFim") ?? "").trim(),
    disciplina: String(formData.get("disciplina") ?? "").trim(),
    professorId: String(formData.get("professorId") ?? "").trim() || undefined,
    sala: String(formData.get("sala") ?? "").trim() || undefined,
  };
}

export async function criarHorario(
  _estadoAnterior: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  await exigirPerfil(["admin"]);
  await ligarBaseDados();

  const dados = lerCampos(formData);
  if (!dados.disciplina || !dados.horaInicio || !dados.horaFim) {
    return "Preenche a disciplina, a hora de início e a hora de fim.";
  }

  try {
    await Horario.create(dados);
  } catch (erro) {
    return erro instanceof Error ? erro.message : "Não foi possível criar o horário.";
  }

  redirect(`/admin/turmas/${dados.turmaId}`);
}

export async function atualizarHorario(
  _estadoAnterior: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  await exigirPerfil(["admin"]);
  await ligarBaseDados();

  const id = String(formData.get("id") ?? "");
  const dados = lerCampos(formData);
  if (!dados.disciplina || !dados.horaInicio || !dados.horaFim) {
    return "Preenche a disciplina, a hora de início e a hora de fim.";
  }

  try {
    await Horario.findByIdAndUpdate(id, dados, { runValidators: true });
  } catch (erro) {
    return erro instanceof Error ? erro.message : "Não foi possível atualizar o horário.";
  }

  redirect(`/admin/turmas/${dados.turmaId}`);
}

export async function removerHorario(formData: FormData): Promise<void> {
  await exigirPerfil(["admin"]);
  await ligarBaseDados();

  const id = String(formData.get("id") ?? "");
  const turmaId = String(formData.get("turmaId") ?? "");

  await Horario.findByIdAndDelete(id);
  redirect(`/admin/turmas/${turmaId}`);
}
