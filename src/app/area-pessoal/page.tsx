import QRCode from "qrcode";
import { exigirPerfil } from "@/lib/permissoes";
import { ligarBaseDados } from "@/lib/mongoose";
import { TokenQR, Utilizador, Horario, Registo, Turma } from "@/models";
import {
  limitesDoMesEmLisboa,
  partesEmLisboa,
  diaDaSemanaEmLisboa,
  formatarData,
} from "@/lib/datas";
import {
  calcularAssiduidade,
  type RegistoParaAssiduidade,
} from "@/lib/relatorios/calcularAssiduidade";
import { GeradorQR } from "./gerador-qr";
import { CabecalhoSecao } from "@/components/cabecalho-secao";
import { HorarioSemanal, type BlocoHorario } from "@/components/horario-semanal";
import type { TokenGerado } from "./acoes";

/**
 * Área pessoal do aluno: o código QR para a portaria (RF15), o horário da
 * sua turma e a sua própria assiduidade do mês.
 *
 * O aluno vê sempre e só os SEUS dados — o id vem da sessão, nunca de um
 * parâmetro do endereço, por isso não há forma de pedir os de outra pessoa.
 */
export default async function PaginaAreaPessoal() {
  const sessao = await exigirPerfil(["aluno"]);
  await ligarBaseDados();

  const agora = new Date();

  const aluno = await Utilizador.findById(sessao.user.id).select("turmaId").lean();

  // Se já houver um código válido (ex.: a pessoa atualizou a página), mostra
  // logo esse, em vez de obrigar a gerar outro sem necessidade.
  const tokenExistente = await TokenQR.findOne({
    alunoId: sessao.user.id,
    usado: false,
    validoAte: { $gt: agora },
  }).lean();

  let tokenInicial: TokenGerado | null = null;
  if (tokenExistente) {
    tokenInicial = {
      validoAteISO: tokenExistente.validoAte.toISOString(),
      imagemDataUrl: await QRCode.toDataURL(tokenExistente.token, { margin: 1, width: 240 }),
    };
  }

  const { ano, mes } = partesEmLisboa(agora);
  const periodo = limitesDoMesEmLisboa(ano, mes);

  const [turma, horarios, registos] = await Promise.all([
    aluno?.turmaId ? Turma.findById(aluno.turmaId).select("nome").lean() : null,
    aluno?.turmaId
      ? Horario.find({ turmaId: aluno.turmaId }).sort({ diaSemana: 1, horaInicio: 1 }).lean()
      : [],
    Registo.find({
      alunoId: sessao.user.id,
      dataHora: { $gte: periodo.inicio, $lt: periodo.fim },
    })
      .select("tipo estado dataHora horarioId")
      .lean(),
  ]);

  const assiduidade = calcularAssiduidade(
    horarios,
    registos as RegistoParaAssiduidade[],
    periodo,
  );

  const blocos: BlocoHorario[] = horarios.map((h) => ({
    diaSemana: h.diaSemana,
    horaInicio: h.horaInicio,
    horaFim: h.horaFim,
    disciplina: h.disciplina,
    sala: h.sala,
  }));

  const faltasEAtrasos = assiduidade.dias.filter((dia) => dia.situacao !== "presenca");

  return (
    <div className="flex min-h-full flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <CabecalhoSecao
        titulo="A minha área"
        subtitulo={turma?.nome}
        voltarHref="/painel"
        voltarLabel="Painel"
      />

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-8">
        <section className="flex flex-col items-center gap-4 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="font-semibold">O meu código QR</h2>
          <p className="max-w-sm text-center text-sm text-slate-500 dark:text-slate-400">
            Mostra este código na portaria para entrar ou sair. É válido durante
            2 minutos e só pode ser usado uma vez.
          </p>
          <GeradorQR tokenInicial={tokenInicial} />
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-4 font-semibold">O meu horário</h2>
          {aluno?.turmaId ? (
            <HorarioSemanal blocos={blocos} diaEmDestaque={diaDaSemanaEmLisboa(agora)} />
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Ainda não tens turma atribuída.
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-4 flex items-center gap-2 font-semibold">
            A minha assiduidade
            <span className="text-sm font-normal text-slate-500 dark:text-slate-400">
              {String(mes).padStart(2, "0")}/{ano}
            </span>
          </h2>

          {assiduidade.diasLetivos === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Ainda não há dias letivos registados neste mês.
            </p>
          ) : (
            <>
              <div className="mb-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Numero titulo="Dias letivos" valor={assiduidade.diasLetivos} />
                <Numero titulo="Presenças" valor={assiduidade.presencas} destaque="ok" />
                <Numero titulo="Atrasos" valor={assiduidade.atrasos} destaque="aviso" />
                <Numero titulo="Faltas" valor={assiduidade.faltas} destaque="critico" />
              </div>

              <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
                Taxa de presença: {(assiduidade.taxaPresenca * 100).toFixed(0)}%
              </p>

              {faltasEAtrasos.length > 0 && (
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Dias a assinalar
                  </h3>
                  <ul className="flex flex-col gap-1 text-sm">
                    {faltasEAtrasos.map((dia) => (
                      <li key={dia.data.toISOString()} className="flex items-center gap-3">
                        <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400">
                          {formatarData(dia.data)}
                        </span>
                        <span
                          className={
                            dia.situacao === "falta"
                              ? "rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950 dark:text-red-300"
                              : "rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                          }
                        >
                          {dia.situacao === "falta" ? "Falta" : "Presença com atraso"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}

function Numero({
  titulo,
  valor,
  destaque,
}: {
  titulo: string;
  valor: number;
  destaque?: "ok" | "aviso" | "critico";
}) {
  const cores = {
    ok: "text-emerald-700 dark:text-emerald-400",
    aviso: "text-amber-700 dark:text-amber-400",
    critico: "text-red-700 dark:text-red-400",
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
      <p className={`text-2xl font-bold tabular-nums ${destaque ? cores[destaque] : ""}`}>{valor}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400">{titulo}</p>
    </div>
  );
}
