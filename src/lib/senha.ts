/**
 * Encriptação e verificação de palavras-passe (RNF05).
 *
 * Usamos o algoritmo Argon2id, através da biblioteca `@node-rs/argon2`.
 * Esta biblioteca é escrita em Rust e distribuída como binário nativo
 * pré-compilado (não corre no runtime Edge, só no Node.js — daí o cuidado
 * de nunca a importar no `middleware.ts`, que corre no Edge).
 *
 * Porque Argon2id e não, por exemplo, MD5 ou SHA-256? Um algoritmo de hash
 * "normal" (SHA-256) foi desenhado para ser RÁPIDO — o que é ótimo para
 * verificar a integridade de um ficheiro, mas péssimo para passwords: um
 * atacante com o hash consegue testar milhões de palavras-passe por segundo
 * numa placa gráfica. O Argon2id é desenhado de propósito para ser LENTO e
 * gastar muita memória, tornando esse ataque muito mais caro. É por isso o
 * algoritmo recomendado pela OWASP para guardar passwords.
 */

import { hash, verify } from "@node-rs/argon2";

/**
 * Parâmetros do Argon2id. Os valores por omissão da biblioteca já
 * correspondem às recomendações da OWASP, mas escrevemo-los aqui de forma
 * explícita para não dependermos de um valor "escondido" numa biblioteca
 * externa — se um dia mudar a versão da biblioteca, o nosso nível de
 * segurança mantém-se igual.
 *
 * `algorithm: 2` é o valor de `Algorithm.Argon2id` definido pela própria
 * biblioteca. Escrevemos o número em vez de importar o `enum` porque o
 * Next.js compila cada ficheiro isoladamente ("isolatedModules"), o que não
 * é compatível com os `const enum` que este pacote exporta.
 */
const OPCOES_ARGON2ID = {
  algorithm: 2, // Algorithm.Argon2id
  memoryCost: 19456, // 19 MiB de memória por tentativa
  timeCost: 2, // 2 iterações
  parallelism: 1, // 1 thread
};

/** Calcula o hash Argon2id de uma palavra-passe em texto simples. */
export async function hashPassword(palavraPasseSimples: string): Promise<string> {
  return hash(palavraPasseSimples, OPCOES_ARGON2ID);
}

/**
 * Compara uma palavra-passe em texto simples com um hash já guardado.
 * Devolve `true` se coincidirem.
 */
export async function verificarPassword(
  palavraPasseSimples: string,
  hashGuardado: string,
): Promise<boolean> {
  return verify(hashGuardado, palavraPasseSimples, OPCOES_ARGON2ID);
}
