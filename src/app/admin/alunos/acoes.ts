"use server";

import { redirect } from "next/navigation";
import { ligarBaseDados } from "@/lib/mongoose";
import { exigirPerfil } from "@/lib/permissoes";
import { hashPassword } from "@/lib/senha";
import { Utilizador, Registo, Ocorrencia, TokenQR } from "@/models";
import { mensagemDeErroMongoose } from "../erros";
import { passkeyValida, ERRO_PASSKEY } from "../passkey";

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
  await exigirPerfil(["gestor", "admin"]);
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
  await exigirPerfil(["gestor", "admin"]);
  await ligarBaseDados();

  if (!passkeyValida(formData)) {
    return ERRO_PASSKEY;
  }

  const id = String(formData.get("id") ?? "");
  const dados = lerCampos(formData);
  if (!dados.nomeCompleto || !dados.email) {
    return "Preenche o nome e o email.";
  }

  const novaPalavraPasse = String(formData.get("palavraPasse") ?? "");

  try {
    // `perfil: "aluno"` no filtro é uma verificação de segurança, não uma
    // otimização: sem ele, este formulário aceitava o id de QUALQUER
    // utilizador — incluindo o do admin — e o campo "palavra-passe" abaixo
    // deixava um gestor mudar a password do admin e entrar como ele,
    // contornando a única coisa que o gestor não pode fazer (o Portão
    // Teste). O id vem do browser e nunca é de confiança sozinho.
    const aluno = await Utilizador.findOne({ _id: id, perfil: "aluno" });
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
  await exigirPerfil(["gestor", "admin"]);
  await ligarBaseDados();

  const id = String(formData.get("id") ?? "");

  if (!passkeyValida(formData)) {
    redirect(`/admin/alunos?erro=${encodeURIComponent(ERRO_PASSKEY)}`);
  }

  // Apaga primeiro o utilizador, com `perfil: "aluno"` no filtro (mesma
  // razão de segurança que em `atualizarAluno`: sem isto, o id vindo do
  // browser dava para apagar o admin). Só se apagou mesmo um aluno é que
  // faz sentido apagar o histórico dele.
  const aluno = await Utilizador.findOneAndDelete({ _id: id, perfil: "aluno" });
  if (!aluno) {
    redirect(`/admin/alunos?erro=${encodeURIComponent("Aluno não encontrado.")}`);
  }

  await Promise.all([
    Registo.deleteMany({ alunoId: aluno._id }),
    Ocorrencia.deleteMany({ alunoId: aluno._id }),
    TokenQR.deleteMany({ alunoId: aluno._id }),
  ]);

  redirect("/admin/alunos");
}
