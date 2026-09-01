/**
 * Lógica de autorização de login por email + palavra-passe.
 *
 * Está separada do ficheiro `auth.ts` de propósito, para ser fácil de testar
 * isoladamente (chamar esta função diretamente, sem ter de simular um pedido
 * HTTP completo ao Auth.js).
 */

import { ligarBaseDados } from "@/lib/mongoose";
import { Utilizador } from "@/models";
import { verificarPassword } from "@/lib/senha";
import type { Perfil } from "@/lib/constantes";

export interface UtilizadorAutenticado {
  id: string;
  email: string;
  name: string;
  perfil: Perfil;
}

/**
 * Verifica um par email + palavra-passe contra a base de dados.
 * Devolve os dados do utilizador se forem válidos, ou `null` caso contrário
 * — nunca diz especificamente se foi o email que não existe ou a password
 * que está errada, para não ajudar alguém a adivinhar que contas existem.
 */
export async function autorizarCredenciais(
  email: unknown,
  palavraPasse: unknown,
): Promise<UtilizadorAutenticado | null> {
  if (typeof email !== "string" || typeof palavraPasse !== "string") {
    return null;
  }

  await ligarBaseDados();

  // `.select("+palavraPasse")` é necessário porque este campo tem
  // `select: false` no modelo (ver src/models/Utilizador.ts) — por omissão
  // não viria na consulta.
  const utilizador = await Utilizador.findOne({
    email: email.trim().toLowerCase(),
  }).select("+palavraPasse");

  // Sem conta, ou conta que só tem login por Google (sem palavra-passe).
  if (!utilizador || !utilizador.palavraPasse) {
    return null;
  }

  const passwordCorreta = await verificarPassword(
    palavraPasse,
    utilizador.palavraPasse,
  );

  if (!passwordCorreta) {
    return null;
  }

  return {
    id: utilizador._id.toString(),
    email: utilizador.email,
    name: utilizador.nomeCompleto,
    perfil: utilizador.perfil,
  };
}
