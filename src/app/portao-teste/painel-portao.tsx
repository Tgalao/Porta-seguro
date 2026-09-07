"use client";

import { useState, useTransition } from "react";
import {
  registarEntradaOuSaida,
  confirmarSaidaComPais,
  lerCodigoQR,
  confirmarIdentidadeQR,
  type AlunoResumo,
  type LinhaRegisto,
  type ResultadoIdentificacao,
} from "./acoes";
import type { MetodoRegisto } from "@/lib/constantes";
import { LeitorQR } from "./leitor-qr";
import { CartaoArrastavel, type CartaoParaSimular } from "./cartao-arrastavel";

type Estado =
  | { passo: "vazio" }
  | { passo: "a-ler" }
  | { passo: "erro"; mensagem: string }
  | { passo: "resultado"; aluno: AlunoResumo; autorizado: boolean; motivo: string }
  | {
      passo: "pendente";
      aluno: AlunoResumo;
      motivo: string;
      horarioId?: string;
      momentoISO: string;
      metodo: MetodoRegisto;
    }
  | { passo: "confirmar-identidade"; aluno: AlunoResumo };

const ROTULOS_ESTADO: Record<string, string> = {
  autorizado: "Autorizado",
  nao_autorizado: "Não autorizado",
  confirmado_pais: "Autorizado (pais)",
};

const ROTULOS_TIPO: Record<string, string> = {
  entrada: "Entrada",
  saida: "Saída",
};

/**
 * Tempo mínimo do ecrã "A ler...". O pedido ao servidor costuma ser mais
 * rápido do que isto; sem uma espera mínima, o resultado aparecia de
 * repente e não se percebia que tinha havido leitura nenhuma.
 */
const ESPERA_MINIMA_MS = 900;

export function PainelPortao({
  linhasIniciais,
  cartoes,
}: {
  linhasIniciais: LinhaRegisto[];
  cartoes: CartaoParaSimular[];
}) {
  const [modoQR, setModoQR] = useState(false);
  const [estado, setEstado] = useState<Estado>({ passo: "vazio" });
  const [linhas, setLinhas] = useState<LinhaRegisto[]>(linhasIniciais);
  const [idSelecionado, setIdSelecionado] = useState(cartoes[0]?.id ?? "");
  const [aEnviar, iniciarTransicao] = useTransition();

  const cartaoSelecionado = cartoes.find((c) => c.id === idSelecionado) ?? cartoes[0];

  /** Comum ao cartão e à confirmação de identidade do QR — ambos devolvem
   * o mesmo formato (ok / pendente / resultado final). */
  function aplicarResultadoIdentificacao(resultado: ResultadoIdentificacao) {
    if (!resultado.ok) {
      setEstado({ passo: "erro", mensagem: resultado.erro });
      return;
    }
    if (resultado.pendente) {
      setEstado({
        passo: "pendente",
        aluno: resultado.aluno,
        motivo: resultado.motivo,
        horarioId: resultado.horarioId,
        momentoISO: resultado.momentoISO,
        metodo: resultado.metodo,
      });
      return;
    }
    setEstado({
      passo: "resultado",
      aluno: resultado.aluno,
      autorizado: resultado.autorizado,
      motivo: resultado.motivo,
    });
    setLinhas((atuais) => [resultado.linha, ...atuais]);
  }

  function aoPassarCartao(numeroCartao: string) {
    setEstado({ passo: "a-ler" });

    iniciarTransicao(async () => {
      // O pedido e a espera mínima correm ao mesmo tempo: o ecrã "A ler..."
      // dura pelo menos ESPERA_MINIMA_MS, mas nunca mais do que o necessário.
      const [resultado] = await Promise.all([
        registarEntradaOuSaida(numeroCartao),
        new Promise((resolve) => setTimeout(resolve, ESPERA_MINIMA_MS)),
      ]);
      aplicarResultadoIdentificacao(resultado);
    });
  }

  function responderContactoPais(paisAutorizaram: boolean) {
    if (estado.passo !== "pendente") return;
    const { aluno, horarioId, momentoISO, metodo } = estado;

    iniciarTransicao(async () => {
      const resultado = await confirmarSaidaComPais(
        aluno.id,
        horarioId,
        momentoISO,
        metodo,
        paisAutorizaram,
      );

      if (!resultado.ok) {
        setEstado({ passo: "erro", mensagem: resultado.erro });
        return;
      }

      setEstado({
        passo: "resultado",
        aluno,
        autorizado: resultado.autorizado,
        motivo: paisAutorizaram
          ? "Saída fora do horário confirmada por telefone com os pais."
          : "Pais contactados; saída não autorizada.",
      });
      setLinhas((atuais) => [resultado.linha, ...atuais]);
    });
  }

  function aoLerTokenQR(token: string) {
    setModoQR(false);
    setEstado({ passo: "a-ler" });

    iniciarTransicao(async () => {
      const [resultado] = await Promise.all([
        lerCodigoQR(token),
        new Promise((resolve) => setTimeout(resolve, ESPERA_MINIMA_MS)),
      ]);

      if (!resultado.ok) {
        setEstado({ passo: "erro", mensagem: resultado.erro });
        return;
      }
      setEstado({ passo: "confirmar-identidade", aluno: resultado.aluno });
    });
  }

  function responderIdentidade(eEsteAluno: boolean) {
    if (estado.passo !== "confirmar-identidade") return;
    const { aluno } = estado;

    iniciarTransicao(async () => {
      const resultado = await confirmarIdentidadeQR(aluno.id, eEsteAluno);

      if (!resultado.ok) {
        setEstado({ passo: "erro", mensagem: resultado.erro });
        return;
      }
      if ("identidadeRejeitada" in resultado) {
        // Nada foi registado — só a ocorrência (RF16) — por isso a tabela
        // de registos de hoje não muda.
        setEstado({
          passo: "resultado",
          aluno: resultado.aluno,
          autorizado: false,
          motivo: resultado.motivo,
        });
        return;
      }
      aplicarResultadoIdentificacao(resultado);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* --- Simulação do cartão, ou a câmara do QR --------------------- */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">
            {modoQR ? "Leitura de código QR" : "Passar cartão"}
          </h2>
          <button
            type="button"
            onClick={() => setModoQR((atual) => !atual)}
            disabled={aEnviar}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            {modoQR ? "← Voltar ao cartão" : "Ler código QR"}
          </button>
        </div>

        {modoQR ? (
          <div className="flex flex-col items-center gap-3">
            <LeitorQR onLido={aoLerTokenQR} />
            <p className="text-center text-xs text-slate-500 dark:text-slate-400">
              Aponta a câmara ao código do telemóvel do aluno.
            </p>
          </div>
        ) : cartoes.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Não há alunos com número de cartão atribuído.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-slate-600 dark:text-slate-300">
                Cartão na mão
              </span>
              <select
                value={idSelecionado}
                onChange={(evento) => setIdSelecionado(evento.target.value)}
                disabled={aEnviar}
                className="rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-transparent"
              >
                {cartoes.map((cartao) => (
                  <option key={cartao.id} value={cartao.id}>
                    {cartao.nome} — {cartao.numeroCartao}
                    {cartao.turma ? ` (${cartao.turma})` : ""}
                  </option>
                ))}
              </select>
            </label>

            {cartaoSelecionado && (
              <CartaoArrastavel
                cartao={cartaoSelecionado}
                aoPassar={aoPassarCartao}
                desativado={aEnviar || estado.passo === "a-ler"}
              />
            )}
          </div>
        )}
      </section>

      {/* --- Resultado -------------------------------------------------- */}
      {estado.passo === "a-ler" && (
        <div
          role="status"
          className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
        >
          <span
            aria-hidden
            className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-teal-600"
          />
          <p className="text-sm font-medium">A ler...</p>
        </div>
      )}

      {estado.passo === "erro" && (
        <p className="rounded-2xl border-l-4 border-red-600 bg-red-50 p-4 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
          {estado.mensagem}
        </p>
      )}

      {estado.passo === "resultado" && (
        <Semaforo cor={estado.autorizado ? "verde" : "vermelho"}>
          <CartaoAluno aluno={estado.aluno} />
          <p className="mt-2 text-sm">{estado.motivo}</p>
          <EstadoPortaEHorario aluno={estado.aluno} />
        </Semaforo>
      )}

      {estado.passo === "confirmar-identidade" && (
        <Semaforo cor="amarelo">
          <CartaoAluno aluno={estado.aluno} />
          <EstadoPortaEHorario aluno={estado.aluno} />
          <p className="mt-3 text-sm font-medium">É esta a pessoa à tua frente?</p>
          <div className="mt-2 flex gap-2">
            <BotaoResposta onClick={() => responderIdentidade(true)} disabled={aEnviar}>
              Sim
            </BotaoResposta>
            <BotaoResposta onClick={() => responderIdentidade(false)} disabled={aEnviar}>
              Não é esta pessoa
            </BotaoResposta>
            <BotaoResposta onClick={() => setEstado({ passo: "vazio" })} disabled={aEnviar}>
              Cancelar
            </BotaoResposta>
          </div>
        </Semaforo>
      )}

      {estado.passo === "pendente" && (
        <Semaforo cor="amarelo">
          <CartaoAluno aluno={estado.aluno} />
          <p className="mt-2 text-sm">{estado.motivo}</p>
          <p className="mt-3 text-sm font-medium">Os pais autorizam a saída?</p>
          <div className="mt-2 flex gap-2">
            <BotaoResposta onClick={() => responderContactoPais(true)} disabled={aEnviar}>
              Sim
            </BotaoResposta>
            <BotaoResposta onClick={() => responderContactoPais(false)} disabled={aEnviar}>
              Não
            </BotaoResposta>
            <BotaoResposta onClick={() => setEstado({ passo: "vazio" })} disabled={aEnviar}>
              Cancelar
            </BotaoResposta>
          </div>
        </Semaforo>
      )}

      {/* --- Registos de hoje ------------------------------------------- */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-3 font-semibold">Registos de hoje</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <th className="py-2 pr-4 font-medium">Hora</th>
                <th className="py-2 pr-4 font-medium">Aluno</th>
                <th className="py-2 pr-4 font-medium">Movimento</th>
                <th className="py-2 pr-4 font-medium">Método</th>
                <th className="py-2 pr-4 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {linhas.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-slate-500 dark:text-slate-400">
                    Ainda sem registos hoje.
                  </td>
                </tr>
              )}
              {linhas.map((linha) => (
                <tr
                  key={linha.id}
                  className="border-b border-slate-100 last:border-0 dark:border-slate-800"
                >
                  <td className="py-2 pr-4 font-mono tabular-nums">{linha.horaFormatada}</td>
                  <td className="py-2 pr-4">{linha.alunoNome}</td>
                  <td className="py-2 pr-4">{ROTULOS_TIPO[linha.tipo]}</td>
                  <td className="py-2 pr-4">{linha.metodo === "cartao" ? "Cartão" : "QR"}</td>
                  <td className="py-2 pr-4">{ROTULOS_ESTADO[linha.estado]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function BotaoResposta({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-600 dark:bg-transparent dark:hover:bg-white/10"
    >
      {children}
    </button>
  );
}

/**
 * Foto do aluno ao lado do nome.
 *
 * É aqui que assenta o RF16: o sistema não tem forma automática de saber se
 * quem apresenta o telemóvel é o dono do código QR, por isso quem confirma é
 * o porteiro, comparando a pessoa à frente com esta fotografia.
 *
 * Quando não há foto guardada, mostram-se as iniciais: deixa claro ao
 * porteiro que não existe fotografia para comparar, em vez de um espaço
 * vazio que se confunde com uma imagem que não carregou.
 */
function CartaoAluno({ aluno }: { aluno: AlunoResumo }) {
  return (
    <div className="flex items-center gap-3">
      {aluno.fotoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={aluno.fotoUrl}
          alt={`Fotografia de ${aluno.nome}`}
          className="h-16 w-16 shrink-0 rounded-full border object-cover"
        />
      ) : (
        <div
          aria-hidden
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-black/10 text-lg font-semibold dark:bg-white/15"
        >
          {iniciais(aluno.nome)}
        </div>
      )}
      <div>
        <p className="text-lg font-semibold">{aluno.nome}</p>
        {aluno.turma && <p className="text-sm opacity-70">{aluno.turma}</p>}
        {!aluno.fotoUrl && <p className="text-xs opacity-60">Sem fotografia no sistema</p>}
      </div>
    </div>
  );
}

/**
 * Estado da porta e horário do dia, para o porteiro decidir se aquela
 * pessoa devia estar ali àquela hora.
 *
 * Não mostra assiduidade nem histórico de faltas de propósito: isso não é
 * da conta do porteiro. O aluno consulta o seu na área pessoal.
 */
function EstadoPortaEHorario({ aluno }: { aluno: AlunoResumo }) {
  const estadoPorta = aluno.estadoPorta;
  if (!estadoPorta) return null;

  const aberta = estadoPorta.estado === "aberta";
  // Já vêm filtrados e ordenados pelo servidor (dia da semana em Lisboa).
  const blocosDeHoje = aluno.blocosHoje ?? [];

  return (
    <div className="mt-4 flex flex-col gap-1.5 border-t border-black/10 pt-3 dark:border-white/10">
      <p className="flex flex-wrap items-center gap-2 font-semibold">
        <span
          aria-hidden
          className={`inline-block h-3.5 w-3.5 rounded-full ${
            aberta ? "bg-emerald-500" : "bg-red-500"
          }`}
        />
        Porta {aberta ? "aberta" : "fechada"}
        {estadoPorta.atrasado && (
          <span className="rounded bg-amber-200 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-900 dark:text-amber-100">
            Chegou atrasado
          </span>
        )}
      </p>
      <p className="text-sm opacity-80">{estadoPorta.motivo}</p>

      {blocosDeHoje.length > 0 && (
        <ul className="mt-1 flex flex-col gap-0.5 text-xs opacity-70">
          {blocosDeHoje.map((bloco, indice) => (
            <li key={indice} className="flex gap-2">
              <span className="font-mono tabular-nums">
                {bloco.horaInicio}–{bloco.horaFim}
              </span>
              <span>{bloco.disciplina}</span>
              {bloco.sala && <span>{bloco.sala}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** "Beatriz Almeida" -> "BA". Nomes de uma só palavra dão uma inicial só. */
function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  const primeira = partes[0]?.[0] ?? "";
  const ultima = partes.length > 1 ? (partes[partes.length - 1]?.[0] ?? "") : "";
  return (primeira + ultima).toUpperCase();
}

function Semaforo({
  cor,
  children,
}: {
  cor: "verde" | "vermelho" | "amarelo";
  children: React.ReactNode;
}) {
  const cores = {
    verde: "border-emerald-500 bg-emerald-50 dark:bg-emerald-950",
    vermelho: "border-red-500 bg-red-50 dark:bg-red-950",
    amarelo: "border-amber-500 bg-amber-50 dark:bg-amber-950",
  };

  return <div className={`rounded-2xl border-l-4 p-5 ${cores[cor]}`}>{children}</div>;
}
