/**
 * Peças visuais partilhadas por quem faz uma identificação e vê o
 * resultado das regras da Fase 3 — o ecrã real da portaria
 * (`/portao-teste`) e a ferramenta de simulação do admin
 * (`/admin/simulacao`). Extraídas daqui para não duplicar ~80 linhas
 * entre os dois sítios.
 */
import type { AlunoResumo } from "@/lib/movimento";

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
export function CartaoAluno({ aluno }: { aluno: AlunoResumo }) {
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
 * Estado da porta e horário do dia, para quem identifica decidir se aquela
 * pessoa devia estar ali àquela hora.
 *
 * Não mostra assiduidade nem histórico de faltas de propósito: isso não é
 * da conta do porteiro (nem do admin, aqui). O aluno consulta o seu na área
 * pessoal.
 */
export function EstadoPortaEHorario({ aluno }: { aluno: AlunoResumo }) {
  const estadoPorta = aluno.estadoPorta;
  if (!estadoPorta) return null;

  const aberta = estadoPorta.estado === "aberta";
  // Já vêm filtrados e ordenados pelo servidor (dia da semana em Lisboa —
  // ou, na simulação, o dia da semana do momento escolhido).
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

export function Semaforo({
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

export function BotaoResposta({
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
