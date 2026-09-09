"use server";

/**
 * Server Actions do ecrã da portaria (UC01 — Registar entrada/saída de
 * aluno). Identificação só por código QR (decisão do aluno: a simulação de
 * cartão físico saiu do Portão Teste). O fluxo tem até três passos:
 *
 *   1. `lerCodigoQR` lê o código: confirma que é válido, ainda não foi
 *      usado, está dentro do minuto de validade e serve para a direção
 *      certa (ver RF15 abaixo). O código só fica marcado como usado e o
 *      aluno só é mostrado ao porteiro para CONFIRMAÇÃO VISUAL — o sistema
 *      não tem forma automática de saber se quem apresenta o telemóvel é
 *      mesmo o dono do código (não há segundo fator); por isso o campo
 *      `fotoUrl` foi acrescentado ao modelo Utilizador logo na Fase 1, para
 *      o porteiro poder comparar com a pessoa à frente. Essa confirmação é
 *      dada a `confirmarIdentidadeQR`.
 *   2. Depois de a identidade confirmada, `processarMovimento` (lógica
 *      partilhada com a simulação do admin — ver `src/lib/movimento.ts`)
 *      aplica as regras da Fase 3, sempre com a hora verdadeira do momento
 *      da leitura. Entradas e saídas autorizadas ficam logo gravadas. Só a
 *      saída NÃO autorizada fica pendente — nesse caso não se grava nada
 *      ainda, porque o 2.º fluxograma do UC01 exige primeiro que o
 *      porteiro contacte os pais.
 *   3. `confirmarSaidaComPais` grava o resultado desse contacto telefónico
 *      (o programa nunca liga para ninguém sozinho — RF04).
 *
 * RF15 (decisão do aluno): um código QR só é válido durante 1 minuto, só
 * pode ser usado uma vez, e fica bloqueado à direção (entrada OU saída)
 * decidida no momento em que foi gerado — ver `proximoTipoRegisto` e
 * `validarTokenQR`. Gerar um código para entrar e tentar usá-lo para sair
 * (ou o inverso) é recusado.
 */

import { ligarBaseDados } from "@/lib/mongoose";
import { exigirPerfil } from "@/lib/permissoes";
import { Utilizador, Turma, Horario, Registo, Ocorrencia, TokenQR } from "@/models";
import { validarTokenQR, proximoTipoRegisto } from "@/lib/regras";
import type { MetodoRegisto } from "@/lib/constantes";
import {
  processarMovimento,
  confirmarSaidaComPais as confirmarSaidaComPaisPartilhado,
  resumoDoAluno,
  type AlunoResumo,
  type LinhaRegisto,
  type ResultadoMovimento,
  type ResultadoConfirmacao,
} from "@/lib/movimento";

export type { AlunoResumo, LinhaRegisto, ResultadoConfirmacao };
export type ResultadoIdentificacao = ResultadoMovimento;

/** Grava a saída pendente depois de o porteiro contactar os pais (RF04). */
export async function confirmarSaidaComPais(
  alunoId: string,
  horarioId: string | undefined,
  momentoISO: string,
  metodo: MetodoRegisto,
  paisAutorizaram: boolean,
): Promise<ResultadoConfirmacao> {
  const sessao = await exigirPerfil(["porteiro", "admin"]);
  return confirmarSaidaComPaisPartilhado(
    alunoId,
    horarioId,
    momentoISO,
    metodo,
    paisAutorizaram,
    sessao.user.id,
  );
}

export type ResultadoLeituraQR =
  | { ok: false; erro: string }
  | {
      ok: true;
      confirmarIdentidade: true;
      aluno: AlunoResumo;
      /** Momento a usar para decidir o movimento — real, ou a hora
       * simulada guardada no código (ver `gerarNovoTokenQR`). */
      momentoISO: string;
      /** "simulacao" quando o código foi gerado com uma hora simulada
       * (só a conta de teste consegue isso) — para o registo final nunca
       * se confundir com um movimento real. */
      metodo: MetodoRegisto;
    };

/**
 * Lê um código QR (RF15). Se for válido, NÃO regista logo o movimento —
 * primeiro pede ao porteiro que confirme visualmente que a pessoa à frente
 * é o aluno da foto (ver explicação no topo do ficheiro).
 */
export async function lerCodigoQR(token: string): Promise<ResultadoLeituraQR> {
  await exigirPerfil(["porteiro", "admin"]);
  await ligarBaseDados();

  const tokenQR = await TokenQR.findOne({ token: token.trim() }).lean();
  if (!tokenQR) {
    return { ok: false, erro: "Código QR não reconhecido." };
  }

  // A validade do código (usado/expirado) é sempre verificada com a hora
  // REAL — o código só continua a existir durante o minuto verdadeiro a
  // seguir a ser gerado, mesmo que carregue uma hora simulada para a
  // decisão. Só a decisão de entrada/saída (mais abaixo) é que usa a hora
  // simulada, quando existe.
  const momento = new Date();
  const momentoDecisao = tokenQR.momentoSimulado ?? momento;
  const metodo: MetodoRegisto = tokenQR.momentoSimulado ? "simulacao" : "qr";

  // A direção esperada é calculada com a MESMA regra usada quando o código
  // foi gerado — se o aluno já teve outro movimento entretanto, deixa de
  // bater certo com `tokenQR.tipo`, e é isso que `validarTokenQR` recusa.
  // Filtrado por antes do momento da decisão, pela mesma razão da
  // simulação do admin: sem isto, um momento simulado no passado ignorava-o
  // e olhava sempre para o registo mais recente de sempre.
  const ultimoRegisto = await Registo.findOne({
    alunoId: tokenQR.alunoId,
    dataHora: { $lt: momentoDecisao },
  })
    .sort({ dataHora: -1 })
    .lean();
  const tipoEsperado = proximoTipoRegisto(ultimoRegisto?.tipo);

  // `alunoIdQueApresenta` é sempre o dono do token: não há, neste ecrã,
  // nenhuma segunda fonte que diga quem está fisicamente a apresentá-lo —
  // essa verificação é feita a seguir, visualmente, pelo porteiro.
  const validacao = validarTokenQR(tokenQR, tokenQR.alunoId, tipoEsperado, momento);

  if (!validacao.valido) {
    await Ocorrencia.create({
      alunoId: tokenQR.alunoId,
      tipo: `qr_${validacao.motivo}`,
      descricao: `Tentativa de utilizar um código QR ${validacao.motivo.replace("_", " ")}.`,
    });

    const mensagem =
      validacao.motivo === "tipo_incorreto"
        ? `Este código só serve para ${tokenQR.tipo === "entrada" ? "entrar" : "sair"}.`
        : MENSAGENS_QR_INVALIDO[validacao.motivo];
    return { ok: false, erro: mensagem };
  }

  // Utilização única (RF15): marca-se como usado já aqui, mesmo que o
  // porteiro venha a rejeitar a identidade a seguir — o código, uma vez
  // lido, não pode voltar a ser tentado.
  await TokenQR.updateOne({ _id: tokenQR._id }, { usado: true, usadoEm: momento });

  const aluno = await Utilizador.findById(tokenQR.alunoId).lean();
  if (!aluno) {
    return { ok: false, erro: "O aluno deste código já não existe." };
  }

  // Além da foto e do nome, o porteiro recebe o horário da turma e o estado
  // da porta — é o que lhe permite decidir se aquela pessoa devia mesmo
  // estar ali àquela hora, sem lhe dar acesso ao histórico de faltas.
  const [turma, horarios] = await Promise.all([
    aluno.turmaId ? Turma.findById(aluno.turmaId).lean() : null,
    aluno.turmaId ? Horario.find({ turmaId: aluno.turmaId }).lean() : [],
  ]);

  return {
    ok: true,
    confirmarIdentidade: true,
    aluno: resumoDoAluno(aluno, turma?.nome, horarios, momentoDecisao),
    momentoISO: momentoDecisao.toISOString(),
    metodo,
  };
}

const MENSAGENS_QR_INVALIDO = {
  aluno_diferente: "Este código QR não pertence a este aluno.",
  ja_utilizado: "Este código QR já foi utilizado.",
  expirado: "Este código QR já expirou.",
} as const;

export type ResultadoConfirmacaoIdentidade =
  | { ok: false; erro: string }
  | { ok: true; identidadeRejeitada: true; aluno: AlunoResumo; motivo: string }
  | ResultadoIdentificacao;

/**
 * Grava a resposta do porteiro à pergunta "é esta a pessoa?" (RF16). Se
 * não for, só fica a ocorrência — não há nenhum movimento a decidir nem
 * registo a criar (ninguém entrou nem saiu).
 */
export async function confirmarIdentidadeQR(
  alunoId: string,
  eEsteAluno: boolean,
  momentoISO: string,
  metodo: MetodoRegisto,
): Promise<ResultadoConfirmacaoIdentidade> {
  const sessao = await exigirPerfil(["porteiro", "admin"]);
  await ligarBaseDados();

  const aluno = await Utilizador.findById(alunoId).lean();
  if (!aluno) {
    return { ok: false, erro: "Aluno já não existe." };
  }

  if (!eEsteAluno) {
    await Ocorrencia.create({
      alunoId: aluno._id,
      tipo: "qr_aluno_diferente",
      descricao: "Porteiro confirmou que a pessoa presente não é o aluno do código QR.",
    });
    return {
      ok: true,
      identidadeRejeitada: true,
      aluno: resumoDoAluno(aluno),
      motivo: "Código QR não corresponde a quem se apresentou.",
    };
  }

  return processarMovimento(aluno, sessao.user.id, metodo, new Date(momentoISO));
}
