/**
 * Segundo fator de autenticação por email, só para as contas admin e gestor
 * (decisão do aluno — endurecimento de segurança, não estava nos requisitos
 * originais).
 *
 * A ideia é simples: saber a palavra-passe deixa de chegar. Depois de a
 * acertar, o sistema manda um código de 6 dígitos por email e só entra quem
 * também tiver acesso a essa caixa de correio. É o "algo que sei" + "algo
 * que tenho" clássico.
 *
 * Porquê só admin e gestor? São as únicas contas que podem mudar a
 * palavra-passe de outras pessoas e ver os dados de todos os alunos —
 * comprometer uma delas é comprometer o sistema inteiro. Pedir um código
 * por email a 20 alunos a entrar todos os dias seria só um estorvo, sem
 * proteger nada que já não esteja protegido pelo perfil.
 */

import crypto from "node:crypto";
import { ligarBaseDados } from "@/lib/mongoose";
import {
  CodigoVerificacao,
  VALIDADE_CODIGO_MINUTOS,
  MAX_TENTATIVAS_CODIGO,
} from "@/models";
import { hashPassword, verificarPassword } from "@/lib/senha";
import { enviarCodigoVerificacao, emailConfigurado } from "@/lib/notificacoes";
import type { Perfil } from "@/lib/constantes";

/** Perfis que têm de confirmar o login com um código enviado por email. */
const PERFIS_COM_DOIS_FATORES: Perfil[] = ["gestor", "admin"];

/**
 * O segundo fator está ligado?
 *
 * Só para os perfis da lista, e só se houver mesmo forma de enviar o email
 * (`RESEND_API_KEY` preenchida). Sem chave configurada, exigir um código
 * que nunca sairia deixava a conta de administração impossível de usar —
 * seria trancar a porta e deitar fora a chave. Ligar/desligar o segundo
 * fator é, portanto, uma decisão de quem controla as variáveis de ambiente
 * do servidor, e essa é também a saída de emergência se um dia o email
 * deixar de funcionar.
 */
export function precisaDoisFatores(perfil: Perfil): boolean {
  return PERFIS_COM_DOIS_FATORES.includes(perfil) && emailConfigurado();
}

/**
 * Cria um código novo, guarda-lhe o hash e envia-o por email.
 *
 * Devolve `false` se o email não conseguiu sair — nesse caso quem chamou
 * tem de recusar o login, em vez de pedir um código que não existe do
 * outro lado.
 */
export async function enviarNovoCodigo(nome: string, email: string): Promise<boolean> {
  await ligarBaseDados();

  const emailNormalizado = email.trim().toLowerCase();

  // `randomInt` e não `Math.random()`: este é um segredo, e o gerador
  // normal do JavaScript é previsível — quem visse alguns valores
  // conseguia calcular os seguintes.
  const codigo = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");

  // Um código de cada vez por conta: pedir um novo invalida o anterior,
  // senão ficavam vários válidos ao mesmo tempo e cada pedido acrescentava
  // mais hipóteses a quem estivesse a adivinhar.
  await CodigoVerificacao.deleteMany({ email: emailNormalizado });
  await CodigoVerificacao.create({
    email: emailNormalizado,
    hash: await hashPassword(codigo),
    tentativas: 0,
    criadoEm: new Date(),
  });

  const enviado = await enviarCodigoVerificacao(
    nome,
    emailNormalizado,
    codigo,
    VALIDADE_CODIGO_MINUTOS,
  );

  // O email não saiu: apaga o código, para não ficar um por aí "válido"
  // que ninguém recebeu.
  if (!enviado) {
    await CodigoVerificacao.deleteMany({ email: emailNormalizado });
  }

  return enviado;
}

/**
 * Confirma o código escrito por quem está a entrar. Só devolve `true` uma
 * vez: acertar consome o código (é apagado), e errar gasta uma das três
 * tentativas — à terceira, o código morre e é preciso pedir outro.
 */
export async function confirmarCodigo(email: unknown, codigo: unknown): Promise<boolean> {
  // Mesma razão do `typeof` em autenticacao.ts: sem isto dava para enviar
  // um objeto (`{"$ne": null}`) e o Mongoose usava-o como operador na
  // consulta — injeção de NoSQL.
  if (typeof email !== "string" || typeof codigo !== "string") return false;

  const codigoLimpo = codigo.trim();
  if (!/^\d{6}$/.test(codigoLimpo)) return false;

  await ligarBaseDados();
  const emailNormalizado = email.trim().toLowerCase();

  const guardado = await CodigoVerificacao.findOne({ email: emailNormalizado });
  if (!guardado) return false;

  // O índice TTL do MongoDB só passa de minuto a minuto, por isso um código
  // expirado pode ainda estar lá — a validade tem de ser confirmada aqui e
  // não presumida a partir de o documento existir.
  const expirouEm = guardado.criadoEm.getTime() + VALIDADE_CODIGO_MINUTOS * 60 * 1000;
  if (Date.now() > expirouEm) {
    await CodigoVerificacao.deleteOne({ _id: guardado._id });
    return false;
  }

  if (guardado.tentativas >= MAX_TENTATIVAS_CODIGO) {
    await CodigoVerificacao.deleteOne({ _id: guardado._id });
    return false;
  }

  if (!(await verificarPassword(codigoLimpo, guardado.hash))) {
    await CodigoVerificacao.updateOne({ _id: guardado._id }, { $inc: { tentativas: 1 } });
    return false;
  }

  // Uso único: acertar gasta o código.
  await CodigoVerificacao.deleteOne({ _id: guardado._id });
  return true;
}
