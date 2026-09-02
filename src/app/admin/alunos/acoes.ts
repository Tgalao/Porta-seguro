"use server";

import { redirect } from "next/navigation";
import { ligarBaseDados } from "@/lib/mongoose";
import { exigirPerfil } from "@/lib/permissoes";
import { hashPassword } from "@/lib/senha";
import { Utilizador, Registo, Ocorrencia, TokenQR } from "@/models";
import { mensagemDeErroMongoose } from "../erros";

function lerCampos(formData: FormData) {
  return {
    nomeCompleto: String(formData.get("nomeCompleto") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    numeroAluno: formData.get("numeroAluno") ? Number(formData.get("numeroAluno")) : undefined,
    numeroCartao: String(formData.get("numeroCartao") ?? "").trim() || undefined,
    turmaId: String(formData.get("turmaId") ?? "").trim() || undefined,
    maiorIdade: formData.get("maiorIdade") === "on",
    autorizacaoPais: formData.get("autorizacaoPais") === "on",
    suspenso: formData.get("suspenso") === "on",
  };
}

export async function criarAluno(
  _estadoAnterior: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  await exigirPerfil(["admin"]);
  await ligarBaseDados();

  const dados = lerCampos(formData);
  if (!dados.nomeCompleto || !dados.email) {
    return "Preenche o nome e o email.";
  }

  const palavraPasseSimples = String(formData.get("palavraPasse") ?? "");

  try {
    await Utilizador.create({
      ...dados,
      perfil: "aluno",
      palavraPasse: palavraPasseSimples ? await hashPassword(palavraPasseSimples) : undefined,
    });
  } catch (erro) {
    return mensagemDeErroMongoose(erro, "Já existe um aluno com esse email, número ou cartão.");
  }

  redirect("/admin/alunos");
}

export async function atualizarAluno(
  _estadoAnterior: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  await exigirPerfil(["admin"]);
  await ligarBaseDados();

  const id = String(formData.get("id") ?? "");
  const dados = lerCampos(formData);
  if (!dados.nomeCompleto || !dados.email) {
    return "Preenche o nome e o email.";
  }

  const novaPalavraPasse = String(formData.get("palavraPasse") ?? "");

  try {
    const aluno = await Utilizador.findById(id);
    if (!aluno) return "Aluno não encontrado.";

    Object.assign(aluno, dados);

    if (novaPalavraPasse) {
      aluno.palavraPasse = await hashPassword(novaPalavraPasse);
    }
    await aluno.save();
  } catch (erro) {
    return mensagemDeErroMongoose(erro, "Já existe um aluno com esse email, número ou cartão.");
  }

  redirect("/admin/alunos");
}

/**
 * Remover um aluno leva consigo o seu histórico (registos, ocorrências e
 * códigos QR) — não há forma de "manter o histórico de alguém que já não
 * existe no sistema" sem confundir os relatórios de assiduidade.
 */
export async function removerAluno(formData: FormData): Promise<void> {
  await exigirPerfil(["admin"]);
  await ligarBaseDados();

  const id = String(formData.get("id") ?? "");

  await Promise.all([
    Registo.deleteMany({ alunoId: id }),
    Ocorrencia.deleteMany({ alunoId: id }),
    TokenQR.deleteMany({ alunoId: id }),
  ]);
  await Utilizador.findByIdAndDelete(id);

  redirect("/admin/alunos");
}
