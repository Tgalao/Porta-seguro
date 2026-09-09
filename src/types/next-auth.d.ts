/**
 * "Aumenta" os tipos do Auth.js com os campos próprios do PortãoSeguro
 * (`id` e `perfil`), que por omissão não existem no `User` nem na `Session`.
 * Sem isto, o TypeScript não deixaria escrever `sessao.user.perfil` em lado
 * nenhum do código.
 */
import type { DefaultSession } from "next-auth";
import type { Perfil } from "@/lib/constantes";

declare module "next-auth" {
  interface User {
    /** Só vem preenchido quando o login é feito por email + palavra-passe. */
    perfil?: Perfil;
  }

  interface Session {
    user: {
      id: string;
      perfil: Perfil;
    } & DefaultSession["user"];
  }
}

// Aumenta a interface JWT no seu módulo de origem real (@auth/core/jwt).
// O "next-auth/jwt" é só um re-export desse módulo, e uma augmentation feita
// aí não chega aos tipos que o Auth.js usa internamente nos callbacks
// jwt()/session() — tem de ser feita diretamente no módulo de origem.
declare module "@auth/core/jwt" {
  interface JWT {
    idUtilizador?: string;
    perfil?: Perfil;
    /** Instante (em milissegundos) a partir do qual esta sessão deixa de
     * valer, além do limite geral de 8 horas. Só as contas admin e gestor
     * o têm preenchido: são expulsas à meia-noite (ver src/auth.ts). */
    expiraEm?: number;
  }
}
