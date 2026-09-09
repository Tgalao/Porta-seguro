/**
 * Valores fixos (enums) usados em vários sítios da aplicação: nos modelos
 * Mongoose (para validar o que se pode guardar), na autenticação (para saber
 * que perfis existem) e na lógica de decisão (Fase 3).
 *
 * Escrevemos cada lista uma única vez aqui, em vez de a repetir em cada
 * ficheiro. Se for preciso acrescentar um perfil novo no futuro, só se muda
 * este ficheiro.
 *
 * O padrão `as const` + `typeof X[number]` cria automaticamente um tipo
 * TypeScript ("union type") a partir da lista, para o compilador nos avisar
 * se escrevermos um valor que não existe (ex.: "profesor" em vez de
 * "professor").
 */

/** Nota: o modelo de dados da análise não incluía "porteiro" na lista de
 * perfis, mas o porteiro é o utilizador principal do ecrã da portaria — sem
 * este perfil ninguém conseguiria autenticar-se para o usar. Foi acrescentado
 * aqui de propósito.
 *
 * "gestor" (decisão do aluno): as mesmas permissões do admin em toda a
 * administração (cursos, turmas, alunos, horários, consultas, simulação),
 * mas SEM acesso ao Portão Teste — é para quem gere a escola no dia a dia,
 * não para quem está fisicamente à entrada a confirmar identidades. Sempre
 * que uma página verifica `perfil === "admin"`, ver se "gestor" também deve
 * poder entrar (quase sempre sim, exceto em /portao-teste). */
export const PERFIS = [
  "aluno",
  "porteiro",
  "professor",
  "dt",
  "coordenador",
  "gestor",
  "admin",
] as const;
export type Perfil = (typeof PERFIS)[number];

/** Tipo de movimento registado na portaria. */
export const TIPOS_REGISTO = ["entrada", "saida"] as const;
export type TipoRegisto = (typeof TIPOS_REGISTO)[number];

/** Forma como o aluno foi identificado. */
export const METODOS_REGISTO = ["cartao", "qr", "simulacao"] as const;
export type MetodoRegisto = (typeof METODOS_REGISTO)[number];

/** Resultado da decisão tomada sobre um registo de entrada/saída. */
export const ESTADOS_REGISTO = [
  "autorizado",
  "nao_autorizado",
  "confirmado_pais",
] as const;
export type EstadoRegisto = (typeof ESTADOS_REGISTO)[number];

/**
 * Tipos de ocorrência irregular (RF16 + RF03). Cobre as três situações do
 * QR referidas no requisito ("expirado, já utilizado ou pertencente a outro
 * aluno"), o bloqueio de entrada de alunos suspensos, e a tentativa de usar
 * um código QR na direção errada — gerado para entrar mas apresentado para
 * sair, ou vice-versa (decisão do aluno: o código fica bloqueado à direção
 * com que foi gerado).
 */
export const TIPOS_OCORRENCIA = [
  "qr_expirado",
  "qr_ja_utilizado",
  "qr_aluno_diferente",
  "qr_tipo_incorreto",
  "entrada_suspenso",
] as const;
export type TipoOcorrencia = (typeof TIPOS_OCORRENCIA)[number];
