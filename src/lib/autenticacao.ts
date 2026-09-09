/**
 * Lógica de autorização de login por email + palavra-passe.
 *
 * Está separada do ficheiro `auth.ts` de propósito, para ser fácil de testar
 * isoladamente (chamar esta função diretamente, sem ter de simular um pedido
 * HTTP completo ao Auth.js).
 */

import { ligarBaseDados } from "@/lib/mongoose";
import { Utilizador, TentativaLogin, MAX_TENTATIVAS, JANELA_MINUTOS } from "@/models";
import { verificarPassword } from "@/lib/senha";
import { precisaDoisFatores, confirmarCodigo } from "@/lib/dois-fatores";
import type { Perfil } from "@/lib/constantes";

export interface UtilizadorAutenticado {
  id: string;
  email: string;
  name: string;
  perfil: Perfil;
}

/**
 * Verifica um par email + palavra-passe contra a base de dados — SEM o
 * segundo fator.
 *
 * Está separada de `autorizarCredenciais` porque o ecrã de login precisa
 * dela sozinha no primeiro passo: para saber a quem enviar o código, é
 * preciso primeiro confirmar que a palavra-passe está certa (senão qualquer
 * pessoa fazia o sistema enviar emails para contas que não são suas).
 *
 * Devolve `null` tanto para email inexistente como para palavra-passe
 * errada — nunca diz qual dos dois falhou, para não ajudar alguém a
 * adivinhar que contas existem.
 */
export async function verificarCredenciais(
  email: unknown,
  palavraPasse: unknown,
  ip?: string,
): Promise<UtilizadorAutenticado | null> {
  // A comparação com `typeof` não é só defensiva contra enganos: sem ela,
  // um atacante podia enviar um OBJETO em vez de texto (ex.: `{"$ne": null}`)
  // e o Mongoose usava-o como operador na consulta abaixo, devolvendo o
  // primeiro utilizador que existisse — a injeção clássica de NoSQL.
  if (typeof email !== "string" || typeof palavraPasse !== "string") {
    return null;
  }

  await ligarBaseDados();

  const emailNormalizado = email.trim().toLowerCase();

  // Limite de tentativas ANTES de verificar a palavra-passe: além de
  // travar quem anda a adivinhar passwords, evita gastar 19 MiB de
  // memória por tentativa a calcular o Argon2id de quem já está bloqueado.
  const desde = new Date(Date.now() - JANELA_MINUTOS * 60 * 1000);
  const falhasRecentes = await TentativaLogin.countDocuments({
    email: emailNormalizado,
    quando: { $gte: desde },
  });
  if (falhasRecentes >= MAX_TENTATIVAS) {
    return null;
  }

  // `.select("+palavraPasse")` é necessário porque este campo tem
  // `select: false` no modelo (ver src/models/Utilizador.ts) — por omissão
  // não viria na consulta.
  const utilizador = await Utilizador.findOne({
    email: emailNormalizado,
  }).select("+palavraPasse");

  // Sem conta, ou conta que só tem login por Google (sem palavra-passe).
  if (!utilizador || !utilizador.palavraPasse) {
    await registarFalha(emailNormalizado, ip);
    return null;
  }

  const passwordCorreta = await verificarPassword(
    palavraPasse,
    utilizador.palavraPasse,
  );

  if (!passwordCorreta) {
    await registarFalha(emailNormalizado, ip);
    return null;
  }

  // Entrou: as falhas anteriores deixam de contar, para quem só se enganou
  // a escrever não ficar bloqueado a seguir.
  await TentativaLogin.deleteMany({ email: emailNormalizado });

  return {
    id: utilizador._id.toString(),
    email: utilizador.email,
    name: utilizador.nomeCompleto,
    perfil: utilizador.perfil,
  };
}

/**
 * O que o Auth.js chama para decidir se alguém entra: palavra-passe certa
 * E, nas contas admin/gestor, o código de 6 dígitos enviado por email.
 *
 * A verificação do código é feita AQUI, e não só no ecrã de login, porque
 * uma Server Action é um endereço HTTP normal — quem soubesse a
 * palavra-passe do admin podia chamar o `signIn` diretamente e saltar o
 * passo do código se ele vivesse só na interface.
 */
export async function autorizarCredenciais(
  email: unknown,
  palavraPasse: unknown,
  codigo: unknown,
  ip?: string,
): Promise<UtilizadorAutenticado | null> {
  const utilizador = await verificarCredenciais(email, palavraPasse, ip);
  if (!utilizador) return null;

  if (!precisaDoisFatores(utilizador.perfil)) {
    return utilizador;
  }

  if (!(await confirmarCodigo(utilizador.email, codigo))) {
    return null;
  }

  return utilizador;
}

/**
 * Guarda uma tentativa falhada. O registo apaga-se sozinho ao fim da
 * janela (índice TTL — ver o modelo), por isso não é preciso limpar nada.
 *
 * Uma falha a gravar isto nunca pode impedir alguém de entrar: se a
 * escrita falhar, o login segue o seu caminho normal (só fica sem
 * contagem), em vez de rebentar com o pedido inteiro.
 */
async function registarFalha(email: string, ip?: string): Promise<void> {
  try {
    await TentativaLogin.create({ email, ip, quando: new Date() });
  } catch {
    // Ignorado de propósito — ver comentário acima.
  }
}
