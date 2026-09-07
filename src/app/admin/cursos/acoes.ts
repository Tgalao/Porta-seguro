"use server";

import { redirect } from "next/navigation";
import { ligarBaseDados } from "@/lib/mongoose";
import { exigirPerfil } from "@/lib/permissoes";
import { Curso, Turma } from "@/models";
import { mensagemDeErroMongoose } from "../erros";
import { passkeyValida, ERRO_PASSKEY } from "../passkey";

function lerCampos(formData: FormData) {
  return {
    nome: String(formData.get("nome") ?? "").trim(),
    sigla: String(formData.get("sigla") ?? "").trim(),
    anosDuracao: Number(formData.get("anosDuracao")),
    coordenadorId: String(formData.get("coordenadorId") ?? "").trim() || undefined,
  };
}

export async function criarCurso(
  _estadoAnterior: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  await exigirPerfil(["admin"]);
  await ligarBaseDados();

  const dados = lerCampos(formData);
  if (!dados.nome || !dados.sigla || !dados.anosDuracao) {
    return "Preenche o nome, a sigla e os anos de duração.";
  }

  try {
    await Curso.create(dados);
  } catch (erro) {
    return mensagemDeErroMongoose(erro, "Já existe um curso com essa sigla.");
  }

  redirect("/admin/cursos");
}

export async function atualizarCurso(
  _estadoAnterior: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  await exigirPerfil(["admin"]);
  await ligarBaseDados();

  if (!passkeyValida(formData)) {
    return ERRO_PASSKEY;
  }

  const id = String(formData.get("id") ?? "");
  const dados = lerCampos(formData);
  if (!dados.nome || !dados.sigla || !dados.anosDuracao) {
    return "Preenche o nome, a sigla e os anos de duração.";
  }

  try {
    await Curso.findByIdAndUpdate(id, dados, { runValidators: true });
  } catch (erro) {
    return mensagemDeErroMongoose(erro, "Já existe um curso com essa sigla.");
  }

  redirect("/admin/cursos");
}

/**
 * UC03 (fluxo alternativo): um curso com turmas associadas não se remove
 * sozinho — evita deixar turmas "órfãs", sem curso.
 */
export async function removerCurso(formData: FormData): Promise<void> {
  await exigirPerfil(["admin"]);
  await ligarBaseDados();

  const id = String(formData.get("id") ?? "");

  if (!passkeyValida(formData)) {
    redirect(`/admin/cursos?erro=${encodeURIComponent(ERRO_PASSKEY)}`);
  }

  const temTurmas = await Turma.exists({ cursoId: id });

  if (temTurmas) {
    redirect(
      `/admin/cursos?erro=${encodeURIComponent("Este curso tem turmas associadas — remove-as primeiro.")}`,
    );
  }

  await Curso.findByIdAndDelete(id);
  redirect("/admin/cursos");
}
