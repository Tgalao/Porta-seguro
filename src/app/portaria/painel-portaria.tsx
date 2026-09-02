"use client";

import { useRef, useState, useTransition } from "react";
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

type Estado =
  | { passo: "vazio" }
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

export function PainelPortaria({ linhasIniciais }: { linhasIniciais: LinhaRegisto[] }) {
  const [numeroCartao, setNumeroCartao] = useState("");
  const [modoQR, setModoQR] = useState(false);
  const [estado, setEstado] = useState<Estado>({ passo: "vazio" });
  const [linhas, setLinhas] = useState<LinhaRegisto[]>(linhasIniciais);
  const [aEnviar, iniciarTransicao] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

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

  function submeterCartao(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const cartao = numeroCartao;
    setNumeroCartao("");

    iniciarTransicao(async () => {
      const resultado = await registarEntradaOuSaida(cartao);
      aplicarResultadoIdentificacao(resultado);
      inputRef.current?.focus();
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
      inputRef.current?.focus();
    });
  }

  function aoLerTokenQR(token: string) {
    setModoQR(false);
    iniciarTransicao(async () => {
      const resultado = await lerCodigoQR(token);

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
      inputRef.current?.focus();
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={submeterCartao} className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          autoFocus
          value={numeroCartao}
          onChange={(evento) => setNumeroCartao(evento.target.value)}
          placeholder="Passar o cartão ou escrever o número"
          className="flex-1 rounded border px-4 py-2"
          disabled={aEnviar}
        />
        <button
          type="submit"
          disabled={aEnviar || !numeroCartao.trim()}
          className="rounded border px-4 py-2 text-sm hover:bg-black/5 disabled:opacity-50 dark:hover:bg-white/10"
        >
          Identificar
        </button>
        <button
          type="button"
          onClick={() => setModoQR((atual) => !atual)}
          disabled={aEnviar}
          className="rounded border px-4 py-2 text-sm hover:bg-black/5 disabled:opacity-50 dark:hover:bg-white/10"
        >
          {modoQR ? "Cancelar leitura QR" : "Ler código QR"}
        </button>
      </form>

      {modoQR && <LeitorQR onLido={aoLerTokenQR} />}

      {estado.passo === "erro" && (
        <p className="rounded bg-red-100 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {estado.mensagem}
        </p>
      )}

      {estado.passo === "resultado" && (
        <Semaforo cor={estado.autorizado ? "verde" : "vermelho"}>
          <p className="font-semibold">{estado.aluno.nome}</p>
          {estado.aluno.turma && <p className="text-sm opacity-70">{estado.aluno.turma}</p>}
          <p className="text-sm">{estado.motivo}</p>
        </Semaforo>
      )}

      {estado.passo === "confirmar-identidade" && (
        <Semaforo cor="amarelo">
          <p className="font-semibold">{estado.aluno.nome}</p>
          {estado.aluno.turma && <p className="text-sm opacity-70">{estado.aluno.turma}</p>}
          <p className="mt-2 text-sm font-medium">É esta a pessoa à tua frente?</p>
          <div className="mt-1 flex gap-2">
            <button
              type="button"
              onClick={() => responderIdentidade(true)}
              disabled={aEnviar}
              className="rounded border px-3 py-1 text-sm hover:bg-black/5 dark:hover:bg-white/10"
            >
              Sim
            </button>
            <button
              type="button"
              onClick={() => responderIdentidade(false)}
              disabled={aEnviar}
              className="rounded border px-3 py-1 text-sm hover:bg-black/5 dark:hover:bg-white/10"
            >
              Não é esta pessoa
            </button>
          </div>
        </Semaforo>
      )}

      {estado.passo === "pendente" && (
        <Semaforo cor="amarelo">
          <p className="font-semibold">{estado.aluno.nome}</p>
          {estado.aluno.turma && <p className="text-sm opacity-70">{estado.aluno.turma}</p>}
          <p className="text-sm">{estado.motivo}</p>
          <p className="mt-2 text-sm font-medium">Os pais autorizam a saída?</p>
          <div className="mt-1 flex gap-2">
            <button
              type="button"
              onClick={() => responderContactoPais(true)}
              disabled={aEnviar}
              className="rounded border px-3 py-1 text-sm hover:bg-black/5 dark:hover:bg-white/10"
            >
              Sim
            </button>
            <button
              type="button"
              onClick={() => responderContactoPais(false)}
              disabled={aEnviar}
              className="rounded border px-3 py-1 text-sm hover:bg-black/5 dark:hover:bg-white/10"
            >
              Não
            </button>
          </div>
        </Semaforo>
      )}

      <div>
        <h2 className="mb-2 text-lg font-semibold">Registos de hoje</h2>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b">
              <th className="py-1 pr-4">Hora</th>
              <th className="py-1 pr-4">Aluno</th>
              <th className="py-1 pr-4">Movimento</th>
              <th className="py-1 pr-4">Método</th>
              <th className="py-1 pr-4">Estado</th>
            </tr>
          </thead>
          <tbody>
            {linhas.length === 0 && (
              <tr>
                <td colSpan={5} className="py-3 text-center opacity-60">
                  Ainda sem registos hoje.
                </td>
              </tr>
            )}
            {linhas.map((linha) => (
              <tr key={linha.id} className="border-b last:border-0">
                <td className="py-1 pr-4">{linha.horaFormatada}</td>
                <td className="py-1 pr-4">{linha.alunoNome}</td>
                <td className="py-1 pr-4">{ROTULOS_TIPO[linha.tipo]}</td>
                <td className="py-1 pr-4">{linha.metodo === "cartao" ? "Cartão" : "QR"}</td>
                <td className="py-1 pr-4">{ROTULOS_ESTADO[linha.estado]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Semaforo({
  cor,
  children,
}: {
  cor: "verde" | "vermelho" | "amarelo";
  children: React.ReactNode;
}) {
  const cores = {
    verde: "border-green-600 bg-green-50 dark:bg-green-950",
    vermelho: "border-red-600 bg-red-50 dark:bg-red-950",
    amarelo: "border-yellow-600 bg-yellow-50 dark:bg-yellow-950",
  };

  return (
    <div className={`rounded border-l-4 p-4 ${cores[cor]}`}>
      {children}
    </div>
  );
}
